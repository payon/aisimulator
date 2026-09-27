import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, hasPermission } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';
import { checkAdminRateLimit } from '@/lib/rate-limit';

/** GET /api/admin/analytics — 사용량 분석 (최근 14일 일별 + 액션/엔티티 집계) */
export async function GET(request: NextRequest) {
  try {
    const rl = checkAdminRateLimit(request);
    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
    }
    const session = authenticateRequest(request);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!(await hasPermission(session.role, 'canViewAnalytics'))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [daily, byAction, byEntity, total] = await Promise.all([
      db.$queryRaw<Array<{ day: string; count: bigint }>>`
        SELECT TO_CHAR("createdAt", 'MM-DD') AS day, COUNT(*)::bigint AS count
        FROM "UserActivity" WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1`,
      db.userActivity.groupBy({ by: ['action'], _count: true, where: { createdAt: { gte: since } }, orderBy: { _count: { action: 'desc' } }, take: 10 }),
      db.userActivity.groupBy({ by: ['entity'], _count: true, where: { createdAt: { gte: since } }, orderBy: { _count: { entity: 'desc' } }, take: 10 }),
      db.userActivity.count({ where: { createdAt: { gte: since } } }),
    ]);

    return NextResponse.json({
      total,
      daily: daily.map((d) => ({ day: d.day, count: Number(d.count) })),
      byAction: byAction.map((a) => ({ name: a.action, count: a._count })),
      byEntity: byEntity.map((e) => ({ name: e.entity, count: e._count })),
    });
  } catch (error) {
    logger.error('Analytics error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
