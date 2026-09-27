import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  createSession,
  deleteSession,
  authenticateRequest,
  verifyPassword,
  createTempToken,
  consumeTempToken,
  sessionCookieHeader,
  clearSessionCookieHeader,
  sessionTokenFromRequest,
} from '@/lib/admin-auth'
import { decryptSecret } from '@/lib/crypto'
import { verifyTotp } from '@/lib/totp'
import { logAction } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { checkRateLimit, checkLoginLock, recordLoginFail, clearLoginFail } from '@/lib/rate-limit'

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
}

function isSecure(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  return request.headers.get('x-forwarded-proto') === 'https';
}

function publicUser(user: { id: string; email: string; name: string; role: string }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

async function finishLogin(user: { id: string; email: string; name: string; role: string }, request: NextRequest) {
  const token = createSession(user.id, user.email, user.role);
  await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const ip = clientIp(request);
  await logAction(user.id, user.email, 'login', 'user', user.id, { action: 'login' }, ip === 'unknown' ? null : ip);

  // 신규 IP 로그인 알림 (첫 로그인이 아니고, 직전 로그인 IP와 다를 때)
  try {
    const lastLogins = await db.auditLog.findMany({
      where: { userId: user.id, action: 'login' },
      orderBy: { createdAt: 'desc' },
      take: 2,
      select: { ip: true },
    });
    const prevIp = lastLogins[1]?.ip;
    if (prevIp && prevIp !== ip) {
      await db.notification.create({
        data: {
          type: 'warning',
          title: '새로운 IP에서 로그인',
          message: `${user.email} 계정이 새로운 IP(${ip})에서 로그인했습니다. (이전: ${prevIp})`,
          targetRole: 'superadmin',
        },
      });
    }
  } catch (e) {
    logger.warn('login IP alert failed', { error: String(e) });
  }

  const res = NextResponse.json({ token, user: publicUser(user) });
  res.headers.append('Set-Cookie', sessionCookieHeader(token, isSecure(request)));
  return res;
}

/**
 * POST /api/admin/auth
 * 1단계 {email, password} → 토큰 발급 or {totpRequired, tempToken} or {mustChangeRequired, tempToken}
 * 2단계 {tempToken, totp} → TOTP 검증 후 토큰 발급
 */
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rl = checkRateLimit(`admin:login:${ip}`, 10, 60)
    if (!rl.success) {
      return NextResponse.json(
        { error: '로그인 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      )
    }

    const body = await request.json()

    // ---- 2단계: TOTP 검증 ----
    if (body.tempToken && body.totp) {
      const userId = consumeTempToken(body.tempToken, 'totp');
      if (!userId) {
        return NextResponse.json({ error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
      }
      const user = await db.adminUser.findUnique({ where: { id: userId } });
      if (!user || !user.isActive || !user.totpEnabled || !user.totpSecret) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      const secret = decryptSecret(user.totpSecret);
      if (!secret || !verifyTotp(secret, String(body.totp))) {
        recordLoginFail(request, user.email);
        return NextResponse.json({ error: '인증 코드가 올바르지 않습니다.' }, { status: 401 });
      }
      clearLoginFail(request, user.email);
      if (user.mustChangePassword) {
        return NextResponse.json({ mustChangeRequired: true, tempToken: createTempToken(user.id, 'force-change') });
      }
      return finishLogin(user, request);
    }

    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // 무차별 대입 잠금 확인 (5회 실패 시 15분)
    const lock = checkLoginLock(request, email)
    if (lock.locked) {
      return NextResponse.json(
        { error: `로그인 실패가 반복되어 잠시 차단되었습니다. ${Math.ceil(lock.retryAfterMs / 60000)}분 후 다시 시도해주세요.` },
        { status: 429 }
      )
    }

    const user = await db.adminUser.findUnique({ where: { email } })

    if (!user || !user.isActive) {
      recordLoginFail(request, email)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      const nowLocked = recordLoginFail(request, email)
      return NextResponse.json(
        { error: nowLocked ? '로그인 실패가 반복되어 15분간 차단되었습니다.' : 'Invalid credentials' },
        { status: 401 }
      )
    }

    clearLoginFail(request, email)

    // 2FA 사용 계정은 2단계로 전환
    if (user.totpEnabled && user.totpSecret) {
      return NextResponse.json({ totpRequired: true, tempToken: createTempToken(user.id, 'totp') });
    }

    // 비밀번호 변경 강제 계정
    if (user.mustChangePassword) {
      return NextResponse.json({ mustChangeRequired: true, tempToken: createTempToken(user.id, 'force-change') });
    }

    return finishLogin(user, request);
  } catch (error) {
    logger.error('Login error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/** DELETE - Logout (헤더·쿠키 토큰 모두 무효화) */
export async function DELETE(request: NextRequest) {
  try {
    const session = authenticateRequest(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const token = sessionTokenFromRequest(request)
    if (token) deleteSession(token)

    const ip = clientIp(request)
    await logAction(session.userId, session.email, 'logout', 'user', session.userId, { action: 'logout' }, ip === 'unknown' ? null : ip)

    const res = NextResponse.json({ message: 'Logged out successfully' });
    res.headers.append('Set-Cookie', clearSessionCookieHeader());
    return res;
  } catch (error) {
    logger.error('Logout error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/** GET - Check current session status */
export async function GET(request: NextRequest) {
  try {
    const session = authenticateRequest(request)
    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    // Get fresh user data
    const user = await db.adminUser.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        totpEnabled: true,
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        ...publicUser(user),
        mustChangePassword: user.mustChangePassword,
        totpEnabled: user.totpEnabled,
      },
    })
  } catch (error) {
    logger.error('Session check error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
