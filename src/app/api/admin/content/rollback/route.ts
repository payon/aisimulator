import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, hasPermission } from '@/lib/admin-auth';
import { logAction } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { checkAdminRateLimit } from '@/lib/rate-limit';
import { recordContentVersion } from '@/lib/versions';

/** POST /api/admin/content/rollback { versionId } — 해당 버전 값으로 복원 */
export async function POST(request: NextRequest) {
  try {
    const rl = checkAdminRateLimit(request);
    if (rl.success === false) {
      return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
    }
    const session = authenticateRequest(request);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!(await hasPermission(session.role, 'canManageContent'))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const { versionId } = await request.json();
    if (!versionId) return NextResponse.json({ error: 'versionId is required' }, { status: 400 });

    const version = await db.contentVersion.findUnique({ where: { id: versionId } });
    if (!version) return NextResponse.json({ error: '버전을 찾을 수 없습니다.' }, { status: 404 });
    const current = await db.content.findUnique({ where: { id: version.contentId } });
    if (!current) return NextResponse.json({ error: '콘텐츠가 삭제되었습니다.' }, { status: 404 });

    // 복원 전 현재값을 버전으로 남김 (되돌리기 가능)
    await recordContentVersion(current.id, current.key, current.value, version.newValue, session.email);
    const item = await db.content.update({
      where: { id: current.id },
      data: { value: version.newValue, updatedBy: session.email },
    });

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;
    await logAction(session.userId, session.email, 'update', 'content', item.id, { action: 'rollback', versionId }, ip);
    return NextResponse.json({ item });
  } catch (error) {
    logger.error('Rollback error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
