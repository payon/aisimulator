import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, hasPermission } from '@/lib/admin-auth';
import { encryptSecret } from '@/lib/crypto';
import { logger } from '@/lib/logger';
import { checkAdminRateLimit } from '@/lib/rate-limit';

/** GET - VAPID 설정 상태 + 구독 목록 (관리자) */
export async function GET(request: NextRequest) {
  try {
    const rl = checkAdminRateLimit(request);
    if (!rl.success) return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });
    const session = authenticateRequest(request);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!(await hasPermission(session.role, 'canManageNotifications'))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const config = await db.siteConfig.findUnique({ where: { id: 'default' } });
    const subs = await db.pushSubscription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, endpoint: true, userAgent: true, createdAt: true },
    });
    return NextResponse.json({
      vapidPublicKey: config?.vapidPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
      hasPrivateKey: Boolean(config?.vapidPrivateKey || process.env.VAPID_PRIVATE_KEY),
      subscriptions: subs.map((s) => ({
        id: s.id,
        endpointPreview: s.endpoint.slice(0, 60) + '...',
        userAgent: s.userAgent,
        createdAt: s.createdAt,
      })),
      count: subs.length,
    });
  } catch (error) {
    logger.error('Push config GET error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST - VAPID 키 저장 { vapidPublicKey, vapidPrivateKey } (비공개키는 암호화) */
export async function POST(request: NextRequest) {
  try {
    const rl = checkAdminRateLimit(request);
    if (!rl.success) return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });
    const session = authenticateRequest(request);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!(await hasPermission(session.role, 'canManageNotifications'))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const { vapidPublicKey, vapidPrivateKey } = await request.json();
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: '공개키와 비공개키를 모두 입력해주세요.' }, { status: 400 });
    }
    await db.siteConfig.upsert({
      where: { id: 'default' },
      update: { vapidPublicKey, vapidPrivateKey: encryptSecret(vapidPrivateKey) },
      create: { id: 'default', vapidPublicKey, vapidPrivateKey: encryptSecret(vapidPrivateKey) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Push config POST error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
