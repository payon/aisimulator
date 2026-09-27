import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// ============================================
// In-memory session store (globalThis for HMR persistence)
// ============================================

interface Session {
  userId: string
  email: string
  role: string
  expiresAt: number
}

// Use globalThis to persist sessions across HMR/module re-evaluations in dev mode
const globalForSessions = globalThis as unknown as {
  __adminSessions?: Map<string, Session>
}

function getSessionsMap(): Map<string, Session> {
  if (!globalForSessions.__adminSessions) {
    globalForSessions.__adminSessions = new Map<string, Session>()
  }
  return globalForSessions.__adminSessions
}

const SESSION_TTL = 24 * 60 * 60 * 1000 // 24 hours

/** Create a new session and return the token */
export function createSession(userId: string, email: string, role: string): string {
  // Clean up expired sessions
  cleanupExpiredSessions()

  const sessions = getSessionsMap()
  const token = crypto.randomUUID()
  const expiresAt = Date.now() + SESSION_TTL

  sessions.set(token, { userId, email, role, expiresAt })
  return token
}

/** Get and validate a session by token. Returns null if invalid or expired. */
export function getSession(token: string): Session | null {
  const sessions = getSessionsMap()
  const session = sessions.get(token)
  if (!session) return null

  if (Date.now() > session.expiresAt) {
    sessions.delete(token)
    return null
  }

  return session
}

/** Delete a session (logout) */
export function deleteSession(token: string): boolean {
  const sessions = getSessionsMap()
  return sessions.delete(token)
}

/** Extract token from Authorization header and validate session */
export function authenticateRequest(request: Request): Session | null {
  const token = sessionTokenFromRequest(request);
  if (!token) return null;
  return getSession(token);
}

/** Check if a role has a specific permission */
export async function hasPermission(
  role: string,
  permission: PermissionKey
): Promise<boolean> {
  const perms = await getPermissionsForRole(role)
  if (!perms) return false
  return perms[permission] ?? false
}

/** Get all permissions for a role */
export async function getPermissionsForRole(role: string) {
  const perm = await db.permission.findUnique({ where: { role } })
  if (!perm) return null
  return {
    canManageUsers: perm.canManageUsers,
    canManageContent: perm.canManageContent,
    canManageConfig: perm.canManageConfig,
    canViewAudit: perm.canViewAudit,
    canDeleteContent: perm.canDeleteContent,
    canManageAPIKeys: perm.canManageAPIKeys,
    canManageNotifications: perm.canManageNotifications,
    canExportData: perm.canExportData,
    canViewAnalytics: perm.canViewAnalytics,
  }
}

/** Verify password against hash */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/** Hash a password */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/** Clean up expired sessions (called periodically) */
function cleanupExpiredSessions() {
  const sessions = getSessionsMap()
  const now = Date.now()
  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(token)
    }
  }
}

/** Get active session count (useful for stats) */
export function getActiveSessionCount(): number {
  cleanupExpiredSessions()
  const sessions = getSessionsMap()
  return sessions.size
}

// Type for permission keys
export type PermissionKey = 'canManageUsers' | 'canManageContent' | 'canManageConfig' | 'canViewAudit' | 'canDeleteContent' | 'canManageAPIKeys' | 'canManageNotifications' | 'canExportData' | 'canViewAnalytics'

/** 비밀번호 정책: 8자 이상 + 영문 + 숫자 (특수문자 권장) */
export function validatePasswordPolicy(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 8) {
    return '비밀번호는 8자 이상이어야 합니다.';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return '비밀번호는 영문과 숫자를 각각 1자 이상 포함해야 합니다.';
  }
  return null;
}

// ============================================
// Single-use 임시 토큰 (2FA 2단계·비밀번호 강제 변경용, 10분)
// ============================================

interface TempToken {
  userId: string;
  purpose: 'totp' | 'force-change';
  expiresAt: number;
}

function getTempMap(): Map<string, TempToken> {
  const g = globalThis as unknown as { __adminTempTokens?: Map<string, TempToken> };
  if (!g.__adminTempTokens) g.__adminTempTokens = new Map<string, TempToken>();
  return g.__adminTempTokens;
}

export function createTempToken(userId: string, purpose: TempToken['purpose']): string {
  const map = getTempMap();
  const token = crypto.randomUUID();
  map.set(token, { userId, purpose, expiresAt: Date.now() + 10 * 60 * 1000 });
  return token;
}

/** 검증 성공 시 userId 반환 + 즉시 폐기 (재사용 불가) */
export function consumeTempToken(token: string, purpose: TempToken['purpose']): string | null {
  const map = getTempMap();
  const entry = map.get(token);
  if (!entry || entry.purpose !== purpose) return null;
  map.delete(token);
  if (Date.now() > entry.expiresAt) return null;
  return entry.userId;
}

// ============================================
// HttpOnly 세션 쿠키 (localStorage 토큰과 병행)
// ============================================

export const SESSION_COOKIE = 'admin_session';

export function sessionCookieHeader(token: string, secure: boolean): string {
  const parts = [`${SESSION_COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=86400'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function tokenFromCookieHeader(request: Request): string | null {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  for (const part of cookie.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === SESSION_COOKIE) return rest.join('=') || null;
  }
  return null;
}

/** Bearer 헤더 우선, 없으면 HttpOnly 쿠키에서 세션 조회 */
export function sessionTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  return tokenFromCookieHeader(request);
}
