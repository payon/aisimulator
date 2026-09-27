import { db } from '@/lib/db';

/** 사용자 활동 기록 (실패해도 본 작업은 계속) */
export async function trackActivity(
  action: string,
  entity: string,
  metadata?: Record<string, unknown> | null,
  request?: Request | null
): Promise<void> {
  try {
    await db.userActivity.create({
      data: {
        action,
        entity,
        metadata: metadata ? JSON.stringify(metadata).slice(0, 2000) : null,
        sessionId: null,
      },
    });
  } catch {
    /* 활동 기록 실패는 무시 */
  }
  void request;
}
