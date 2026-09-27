import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, hasPermission } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';
import { checkAdminRateLimit } from '@/lib/rate-limit';

function limited(request: NextRequest) {
  const rl = checkAdminRateLimit(request);
  if (!rl.success) {
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  }
  return null;
}

/** GET /api/admin/content/versions?contentId= — 버전 이력 (최신순) */
export async function GET(request: NextRequest) {
  try {
    const l = limited(request);
    if (l) return l;
    const session = authenticateRequest(request);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!(await hasPermission(session.role, 'canManageContent'))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const contentId = new URL(request.url).searchParams.get('contentId');
    if (!contentId) return NextResponse.json({ error: 'contentId is required' }, { status: 400 });
    const versions = await db.contentVersion.findMany({
      where: { contentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ versions });
  } catch (error) {
    logger.error('Versions list error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
