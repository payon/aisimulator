// === In-Memory Rate Limiting (fixed window) ===

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// 로그인 무차별 대입 방어용 실패 기록 (IP+email 기준)
interface LoginFailEntry {
  fails: number;
  lockedUntil: number;
  lastFail: number;
}

const loginFailMap = new Map<string, LoginFailEntry>();

const LOGIN_MAX_FAILS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000; // 15분
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

// 주기적으로 만료된 항목 정리
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetTime <= now) {
      rateLimitMap.delete(key);
    }
  }
  for (const [key, entry] of loginFailMap.entries()) {
    if (entry.lockedUntil <= now && now - entry.lastFail > LOGIN_WINDOW_MS) {
      loginFailMap.delete(key);
    }
  }
}, 60000);

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

export function checkRateLimit(
  key: string,
  limit: number = 30,
  windowSeconds: number = 60
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetTime <= now) {
    const resetTime = now + windowSeconds * 1000;
    rateLimitMap.set(key, { count: 1, resetTime });
    return { success: true, remaining: limit - 1, resetTime };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  };
}

/** 관리자 API 공용 제한: 토큰/IP 기준 200회/분 */
export function checkAdminRateLimit(request: Request): RateLimitResult {
  const auth = request.headers.get('Authorization') || '';
  const key = auth.startsWith('Bearer ')
    ? `admin:token:${auth.slice(7, 27)}`
    : `admin:ip:${getClientIp(request)}`;
  return checkRateLimit(key, 200, 60);
}

/** 로그인 시도 전 잠금 여부 확인. 잠겨 있으면 남은 ms 반환 */
export function checkLoginLock(request: Request, email: string): { locked: boolean; retryAfterMs: number } {
  const key = `login:${getClientIp(request)}:${email.toLowerCase().trim()}`;
  const entry = loginFailMap.get(key);
  if (!entry) return { locked: false, retryAfterMs: 0 };
  const now = Date.now();
  if (entry.fails >= LOGIN_MAX_FAILS && entry.lockedUntil > now) {
    return { locked: true, retryAfterMs: entry.lockedUntil - now };
  }
  return { locked: false, retryAfterMs: 0 };
}

/** 로그인 실패 기록. 잠금이 걸리면 true 반환 */
export function recordLoginFail(request: Request, email: string): boolean {
  const key = `login:${getClientIp(request)}:${email.toLowerCase().trim()}`;
  const now = Date.now();
  const prev = loginFailMap.get(key);
  const fails = prev && now - prev.lastFail < LOGIN_WINDOW_MS ? prev.fails + 1 : 1;
  const lockedUntil = fails >= LOGIN_MAX_FAILS ? now + LOGIN_LOCK_MS : 0;
  loginFailMap.set(key, { fails, lockedUntil, lastFail: now });
  return fails >= LOGIN_MAX_FAILS;
}

/** 로그인 성공 시 실패 기록 초기화 */
export function clearLoginFail(request: Request, email: string): void {
  const key = `login:${getClientIp(request)}:${email.toLowerCase().trim()}`;
  loginFailMap.delete(key);
}
