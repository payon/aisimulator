import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const notifications = await db.notification.findMany({
      where: { targetRole: null }, // 공개 알림만
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    // 테이블이 없을 수 있으므로 빈 배열 반환
    return NextResponse.json({ notifications: [] });
  }
}
