import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, hasPermission } from '@/lib/admin-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const canManage = await hasPermission(session.role, 'canManageUsers');
  if (!canManage) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const permission = await db.permission.update({
      where: { id },
      data: {
        canManageUsers: body.canManageUsers,
        canManageContent: body.canManageContent,
        canManageConfig: body.canManageConfig,
        canViewAudit: body.canViewAudit,
        canDeleteContent: body.canDeleteContent,
        canManageAPIKeys: body.canManageAPIKeys,
        canManageNotifications: body.canManageNotifications,
        canExportData: body.canExportData,
        canViewAnalytics: body.canViewAnalytics,
      },
    });

    return NextResponse.json({ success: true, permission });
  } catch (error) {
    return NextResponse.json({ error: '권한 업데이트에 실패했습니다.' }, { status: 500 });
  }
}
