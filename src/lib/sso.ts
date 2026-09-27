// 범용 OIDC SSO (Authorization Code)
// 환경변수: OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, (선택 OIDC_SCOPES)
// 콜백 URL: {NEXT_PUBLIC_SITE_URL}/api/admin/sso/callback
import { randomBytes } from 'crypto';

export function ssoEnabled(): boolean {
  return Boolean(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET);
}

export function ssoConfig() {
  const issuer = (process.env.OIDC_ISSUER || '').replace(/\/$/, '');
  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  return {
    issuer,
    clientId: process.env.OIDC_CLIENT_ID || '',
    clientSecret: process.env.OIDC_CLIENT_SECRET || '',
    scopes: process.env.OIDC_SCOPES || 'openid email profile',
    redirectUri: `${site}/api/admin/sso/callback`,
  };
}

interface SsoState { createdAt: number }
const states = new Map<string, SsoState>();

export function createSsoState(): string {
  const s = randomBytes(16).toString('hex');
  states.set(s, { createdAt: Date.now() });
  return s;
}

export function consumeSsoState(s: string): boolean {
  const e = states.get(s);
  states.delete(s);
  if (!e) return false;
  return Date.now() - e.createdAt < 10 * 60 * 1000;
}

export function buildAuthorizeUrl(state: string): string {
  const c = ssoConfig();
  const q = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    response_type: 'code',
    scope: c.scopes,
    state,
  });
  return `${c.issuer}/authorize?${q.toString()}`;
}

export async function exchangeCode(code: string): Promise<{ email: string; name: string }> {
  const c = ssoConfig();
  const tokenRes = await fetch(`${c.issuer}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: c.redirectUri,
      client_id: c.clientId,
      client_secret: c.clientSecret,
    }),
  });
  if (!tokenRes.ok) throw new Error(`token exchange failed: ${tokenRes.status}`);
  const tokens = await tokenRes.json();
  const accessToken = tokens.access_token;
  if (!accessToken) throw new Error('no access_token');
  const userRes = await fetch(`${c.issuer}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) throw new Error(`userinfo failed: ${userRes.status}`);
  const info = await userRes.json();
  const email = info.email;
  if (!email) throw new Error('no email in userinfo');
  return { email, name: info.name || info.preferred_username || email };
}
