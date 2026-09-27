import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, hasPermission } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';
import { checkAdminRateLimit } from '@/lib/rate-limit';
import { pruneAuditLogs } from '@/lib/retention';

/** POST /api/admin/audit/prune { days } — 보존 기간 초과 감사 로그 수동 정리 */
export async function POST(request: NextRequest) {
  try {
    const rl = checkAdminRateLimit(request);
    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
    }
    const session = authenticateRequest(request);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!(await hasPermission(session.role, 'canManageConfig'))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const { days } = await request.json().catch(() => ({}));
    const retention = Number(days ?? process.env.AUDIT_RETENTION_DAYS ?? 365);
    if (!Number.isFinite(retention) || retention < 30) {
      return NextResponse.json({ error: '보존 기간은 30일 이상이어야 합니다.' }, { status: 400 });
    }
    const deleted = await pruneAuditLogs(retention);
    return NextResponse.json({ success: true, deleted, retentionDays: retention });
  } catch (error) {
    logger.error('Audit prune error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
