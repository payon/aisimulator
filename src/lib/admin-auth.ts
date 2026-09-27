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
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  return getSession(token)
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
