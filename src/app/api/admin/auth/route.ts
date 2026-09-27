import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  createSession,
  deleteSession,
  authenticateRequest,
  verifyPassword,
} from '@/lib/admin-auth'
import { logAction } from '@/lib/audit'
import { checkRateLimit, checkLoginLock, recordLoginFail, clearLoginFail } from '@/lib/rate-limit'

/** POST - Login with email/password */
export async function POST(request: NextRequest) {
  try {
    // 로그인 엔드포인트 Rate Limit: IP 기준 10회/분
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    const rl = checkRateLimit(`admin:login:${ip}`, 10, 60)
    if (!rl.success) {
      return NextResponse.json(
        { error: '로그인 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      )
    }

    const body = await request.json()
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

    // Create session
    const token = createSession(user.id, user.email, user.role)

    // Update last login
    await db.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Audit log
    await logAction(user.id, user.email, 'login', 'user', user.id, { action: 'login' }, ip === 'unknown' ? null : ip)

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/** DELETE - Logout */
export async function DELETE(request: NextRequest) {
  try {
    const session = authenticateRequest(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.slice(7) ?? ''
    deleteSession(token)

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
    await logAction(session.userId, session.email, 'logout', 'user', session.userId, { action: 'logout' }, ip)

    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
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
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
