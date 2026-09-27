import { db } from '@/lib/db';

/** 콘텐츠 수정 전 버전 스냅샷 기록 (실패해도 본 작업은 계속) */
export async function recordContentVersion(
  contentId: string,
  key: string,
  oldValue: string | null,
  newValue: string,
  changedBy?: string | null
): Promise<void> {
  try {
    if (oldValue === newValue) return;
    await db.contentVersion.create({
      data: { contentId, key, oldValue, newValue, updatedBy: changedBy ?? null },
    });
  } catch (e) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', msg: 'version record failed', error: String(e) }));
  }
}
