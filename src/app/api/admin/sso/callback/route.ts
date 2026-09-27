import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession, sessionCookieHeader } from '@/lib/admin-auth';
import { logAction } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { ssoEnabled, consumeSsoState, exchangeCode } from '@/lib/sso';

function site(req: NextRequest): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '') || req.nextUrl.origin;
}

/** GET - OIDC 콜백: 이메일 기준 로그인/자동연동 */
export async function GET(request: NextRequest) {
  try {
    if (!ssoEnabled()) return NextResponse.json({ error: 'SSO가 설정되지 않았습니다.' }, { status: 400 });
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    if (!code || !state || !consumeSsoState(state)) {
      return NextResponse.redirect(`${site(request)}/admin?error=sso`);
    }
    const { email, name } = await exchangeCode(code);

    let user = await db.adminUser.findUnique({ where: { email } });
    if (user && !user.isActive) {
      return NextResponse.redirect(`${site(request)}/admin?error=inactive`);
    }
    if (!user) {
      user = await db.adminUser.create({
        data: {
          email,
          name,
          passwordHash: `sso:${Date.now()}`,
          role: 'viewer',
          isActive: true,
        },
      });
      await logAction(user.id, user.email, 'create', 'user', user.id, { action: 'sso-signup' }, null);
    }

    const token = createSession(user.id, user.email, user.role);
    await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await logAction(user.id, user.email, 'login', 'user', user.id, { action: 'sso-login' }, null);

    const secure = process.env.NODE_ENV === 'production' || request.headers.get('x-forwarded-proto') === 'https';
    const res = NextResponse.redirect(`${site(request)}/admin`);
    res.headers.append('Set-Cookie', sessionCookieHeader(token, secure));
    return res;
  } catch (error) {
    logger.error('SSO callback error', { error: String(error) });
    return NextResponse.redirect(`${site(request)}/admin?error=sso`);
  }
}
