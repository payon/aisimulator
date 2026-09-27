import { db } from '@/lib/db'

/**
 * Log an action to the audit log.
 *
 * @param userId - The ID of the user performing the action
 * @param userEmail - The email of the user performing the action
 * @param action - The action type: create, update, delete, login, logout
 * @param entity - The entity being acted upon: content, user, config, settings
 * @param entityId - The ID of the specific entity record
 * @param changes - A description or object of what changed (will be JSON-stringified if object)
 * @param ip - The IP address of the requester
 */
export async function logAction(
  userId: string | null,
  userEmail: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  changes?: Record<string, unknown> | string | null,
  ip?: string | null
): Promise<void> {
  try {
    const changesStr = changes
      ? typeof changes === 'string'
        ? changes
        : JSON.stringify(changes)
      : null

    await db.auditLog.create({
      data: {
        userId,
        userEmail,
        action,
        entity,
        entityId: entityId ?? null,
        changes: changesStr,
        ip: ip ?? null,
      },
    })
  } catch (error) {
    // Audit logging should never break the main operation
    console.error('Failed to write audit log:', error)
  }
}
