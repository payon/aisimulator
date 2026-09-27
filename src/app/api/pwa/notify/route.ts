import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, hasPermission } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';
import { checkAdminRateLimit } from '@/lib/rate-limit';

/** POST - 푸시 알림 발송 (관리자, 실제 Web Push 전송) */
export async function POST(request: NextRequest) {
  try {
    const rl = checkAdminRateLimit(request);
    if (!rl.success) {
      return NextResponse.json({ success: false, error: '요청이 너무 많습니다.' }, { status: 429 });
    }
    const session = authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }
    if (!(await hasPermission(session.role, 'canManageNotifications'))) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { title, message, url, icon } = body;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: 'title과 message가 필요합니다.' },
        { status: 400 }
      );
    }

    const { sendPushToAll } = await import('@/lib/push');
    const { sent, failed } = await sendPushToAll({ title, body: message, url, icon });

    return NextResponse.json({ success: true, sent, failed });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '알림 전송에 실패했습니다.';
    logger.error('[PWA] Push send error', { error: msg });
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
