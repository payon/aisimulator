// Web Push 발송 헬퍼 (VAPID)
import webpush from 'web-push';
import { db } from '@/lib/db';
import { decryptSecret } from '@/lib/crypto';

export async function getVapidKeys(): Promise<{ publicKey: string | null; privateKey: string | null }> {
  const envPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || null;
  const envPriv = process.env.VAPID_PRIVATE_KEY || null;
  try {
    const config = await db.siteConfig.findUnique({ where: { id: 'default' } });
    return {
      publicKey: config?.vapidPublicKey || envPub,
      privateKey: decryptSecret(config?.vapidPrivateKey) || envPriv,
    };
  } catch {
    return { publicKey: envPub, privateKey: envPriv };
  }
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

export async function sendPushToAll(payload: PushPayload): Promise<{ sent: number; failed: number }> {
  const { publicKey, privateKey } = await getVapidKeys();
  if (!publicKey || !privateKey) {
    throw new Error('VAPID 키가 설정되지 않았습니다. 관리자 푸시 메뉴에서 설정하세요.');
  }
  webpush.setVapidDetails('mailto:admin@aiplatform.kr', publicKey, privateKey);

  const subs = await db.pushSubscription.findMany();
  let sent = 0;
  let failed = 0;
  const notification = {
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    data: { url: payload.url || '/' },
  };
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(notification)
      );
      sent++;
    } catch {
      failed++;
      // 만료된 구독(404/410)은 정리
      try {
        await db.pushSubscription.delete({ where: { id: sub.id } });
      } catch { /* ignore */ }
    }
  }
  return { sent, failed };
}
