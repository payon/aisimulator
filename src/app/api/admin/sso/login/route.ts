import { NextResponse } from 'next/server';
import { ssoEnabled, buildAuthorizeUrl, createSsoState } from '@/lib/sso';

/** GET - IdP 로그인으로 리다이렉트 */
export async function GET() {
  if (!ssoEnabled()) {
    return NextResponse.json({ error: 'SSO가 설정되지 않았습니다.' }, { status: 400 });
  }
  return NextResponse.redirect(buildAuthorizeUrl(createSsoState()));
}
