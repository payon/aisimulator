import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/admin-auth'
import { encryptSecret, decryptSecret } from '@/lib/crypto'
import { generateTotpSecret, verifyTotp, totpAuthUrl } from '@/lib/totp'
import { logAction } from '@/lib/audit'
import { logger } from '@/lib/logger'

/**
 * 2단계 인증(TOTP) 관리 — 본인 계정 대상
 * GET: 상태 조회 { totpEnabled }
 * POST: 시크릿 발급 { secret, otpauthUrl } (아직 미활성, 인증 앱에 등록용)
 * PUT: { token } 검증 후 활성화
 * DELETE: { password } 확인 후 비활성화
 */
export async function GET(request: NextRequest) {
  const session = authenticateRequest(request);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const user = await db.adminUser.findUnique({ where: { id: session.userId }, select: { totpEnabled: true } });
  return NextResponse.json({ totpEnabled: user?.totpEnabled ?? false });
}

export async function POST(request: NextRequest) {
  try {
    const session = authenticateRequest(request);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const secret = generateTotpSecret();
    await db.adminUser.update({
      where: { id: session.userId },
      data: { totpSecret: encryptSecret(secret), totpEnabled: false },
    });
    const user = await db.adminUser.findUnique({ where: { id: session.userId }, select: { email: true } });
    return NextResponse.json({ secret, otpauthUrl: totpAuthUrl(secret, user?.email || 'admin') });
  } catch (error) {
    logger.error('TOTP setup error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = authenticateRequest(request);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { token } = await request.json();
    const user = await db.adminUser.findUnique({ where: { id: session.userId } });
    const secret = decryptSecret(user?.totpSecret);
    if (!secret || !verifyTotp(secret, String(token || ''))) {
      return NextResponse.json({ error: '인증 코드가 올바르지 않습니다.' }, { status: 400 });
    }
    await db.adminUser.update({ where: { id: session.userId }, data: { totpEnabled: true } });
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;
    await logAction(session.userId, session.email, 'update', 'user', session.userId, { action: 'totp-enable' }, ip);
    return NextResponse.json({ success: true, totpEnabled: true });
  } catch (error) {
    logger.error('TOTP enable error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = authenticateRequest(request);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { password } = await request.json().catch(() => ({}));
    const { verifyPassword } = await import('@/lib/admin-auth');
    const user = await db.adminUser.findUnique({ where: { id: session.userId } });
    if (!user || !password || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }
    await db.adminUser.update({ where: { id: session.userId }, data: { totpEnabled: false, totpSecret: null } });
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;
    await logAction(session.userId, session.email, 'update', 'user', session.userId, { action: 'totp-disable' }, ip);
    return NextResponse.json({ success: true, totpEnabled: false });
  } catch (error) {
    logger.error('TOTP disable error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
