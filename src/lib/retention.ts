import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

/** 보존 기간(일) 초과 감사 로그 삭제. 삭제 건수 반환 */
export async function pruneAuditLogs(retentionDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await db.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  if (result.count > 0) {
    logger.info('audit logs pruned', { deleted: result.count, retentionDays });
  }
  return result.count;
}
