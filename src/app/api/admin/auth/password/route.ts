import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  authenticateRequest,
  verifyPassword,
  hashPassword,
  validatePasswordPolicy,
  consumeTempToken,
} from '@/lib/admin-auth'
import { logAction } from '@/lib/audit'
import { logger } from '@/lib/logger'

/**
 * PUT /api/admin/auth/password — 본인 비밀번호 변경
 * - 로그인 상태: { oldPassword, newPassword }
 * - 강제 변경 흐름: { tempToken, newPassword }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldPassword, newPassword, tempToken } = body;

    const policyError = validatePasswordPolicy(newPassword);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }

    let userId: string | null = null;

    if (tempToken) {
      userId = consumeTempToken(tempToken, 'force-change');
      if (!userId) {
        return NextResponse.json({ error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
      }
    } else {
      const session = authenticateRequest(request);
      if (!session) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }
      userId = session.userId;
      if (!oldPassword) {
        return NextResponse.json({ error: '현재 비밀번호를 입력해주세요.' }, { status: 400 });
      }
      const me = await db.adminUser.findUnique({ where: { id: userId } });
      if (!me || !(await verifyPassword(oldPassword, me.passwordHash))) {
        return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 401 });
      }
    }

    const user = await db.adminUser.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
    });

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;
    await logAction(user.id, user.email, 'update', 'user', user.id, { action: 'password-change' }, ip);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Password change error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
