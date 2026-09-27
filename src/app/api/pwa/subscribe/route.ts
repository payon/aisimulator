import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkAdminRateLimit } from '@/lib/rate-limit';

/** POST - 푸시 구독 등록 (upsert) */
export async function POST(request: NextRequest) {
  try {
    const rl = checkAdminRateLimit(request);
    if (!rl.success) {
      return NextResponse.json({ success: false, error: '요청이 너무 많습니다.' }, { status: 429 });
    }
    const body = await request.json();
    const { endpoint, keys, userId } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { success: false, error: 'endpoint와 keys(p256dh/auth)가 필요합니다.' },
        { status: 400 }
      );
    }

    await db.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: request.headers.get('user-agent'),
      },
      update: { p256dh: keys.p256dh, auth: keys.auth },
    });

    return NextResponse.json({ success: true, message: '푸시 알림 구독이 등록되었습니다.' });
  } catch (error) {
    logger.error('[PWA] Push subscription error', { error: String(error) });
    return NextResponse.json({ success: false, error: '구독 등록에 실패했습니다.' }, { status: 500 });
  }
}

/** DELETE - 푸시 구독 해제 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ success: false, error: 'endpoint가 필요합니다.' }, { status: 400 });
    }

    await db.pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ success: true, message: '구독이 해제되었습니다.' });
  } catch (error) {
    logger.error('[PWA] Push unsubscribe error', { error: String(error) });
    return NextResponse.json({ success: false, error: '해제에 실패했습니다.' }, { status: 500 });
  }
}

/** GET - VAPID 공개키 조회 (클라이언트 구독용, 공개) */
export async function GET() {
  try {
    const { getVapidKeys } = await import('@/lib/push');
    const { publicKey } = await getVapidKeys();
    return NextResponse.json({ success: true, vapidPublicKey: publicKey });
  } catch (error) {
    logger.error('[PWA] VAPID key fetch error', { error: String(error) });
    return NextResponse.json({ success: false, error: '조회에 실패했습니다.' }, { status: 500 });
  }
}
