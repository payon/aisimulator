import { NextResponse } from 'next/server';
import { ssoEnabled } from '@/lib/sso';

/** GET - SSO 사용 가능 여부 (공개) */
export async function GET() {
  return NextResponse.json({ enabled: ssoEnabled() });
}
