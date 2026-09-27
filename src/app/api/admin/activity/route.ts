import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, hasPermission } from '@/lib/admin-auth';

// GET - 활동 내역 조회 (분석 대시보드용)
export async function GET(request: NextRequest) {
  const session = authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const canView = await hasPermission(session.role, 'canViewAnalytics');
  if (!canView) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalActivities, recentActivities, byEntity, byAction] = await Promise.all([
      // 총 활동 수
      db.userActivity.count({
        where: { createdAt: { gte: since } },
      }),
      // 최근 활동
      db.userActivity.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      // 엔티티별 활동 수
      db.userActivity.groupBy({
        by: ['entity'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      // 액션별 활동 수
      db.userActivity.groupBy({
        by: ['action'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      totalActivities,
      recentActivities,
      byEntity: byEntity.map((e) => ({ entity: e.entity, count: e._count })),
      byAction: byAction.map((a) => ({ action: a.action, count: a._count })),
    });
  } catch (error) {
    return NextResponse.json({ error: '활동 내역을 불러오지 못했습니다.' }, { status: 500 });
  }
}
