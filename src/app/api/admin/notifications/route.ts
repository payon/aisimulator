import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, hasPermission } from '@/lib/admin-auth';

// GET - 모든 알림 조회 (관리자용)
export async function GET(request: NextRequest) {
  const session = authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const canView = await hasPermission(session.role, 'canManageNotifications');
  if (!canView) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const notifications = await db.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    return NextResponse.json({ error: '알림을 불러오지 못했습니다.' }, { status: 500 });
  }
}

// POST - 새 알림 생성
export async function POST(request: NextRequest) {
  const session = authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const canManage = await hasPermission(session.role, 'canManageNotifications');
  if (!canManage) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { type, priority, title, message, targetRole } = body;

    if (!title || !message) {
      return NextResponse.json({ error: '제목과 메시지는 필수입니다.' }, { status: 400 });
    }

    const notification = await db.notification.create({
      data: {
        type: type || 'info',
        priority: priority || 'normal',
        title,
        message,
        targetRole: targetRole || null,
      },
    });

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    return NextResponse.json({ error: '알림 생성에 실패했습니다.' }, { status: 500 });
  }
}
