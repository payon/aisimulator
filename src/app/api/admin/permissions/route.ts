import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, hasPermission } from '@/lib/admin-auth';

// GET - 모든 권한 조회
export async function GET(request: NextRequest) {
  const session = authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  try {
    const permissions = await db.permission.findMany({
      orderBy: { role: 'asc' },
    });

    // 권한이 없는 역할도 표시하기 위해 기본값 보장
    const defaultRoles = ['superadmin', 'admin', 'editor', 'viewer'];
    for (const role of defaultRoles) {
      const exists = permissions.find((p) => p.role === role);
      if (!exists) {
        const created = await db.permission.create({
          data: {
            role,
            canManageUsers: role === 'superadmin' || role === 'admin',
            canManageContent: true,
            canManageConfig: role === 'superadmin' || role === 'admin',
            canViewAudit: role === 'superadmin' || role === 'admin',
            canDeleteContent: role === 'superadmin' || role === 'admin',
            canManageAPIKeys: role === 'superadmin',
            canManageNotifications: role === 'superadmin' || role === 'admin',
            canExportData: role === 'superadmin' || role === 'admin',
            canViewAnalytics: role === 'superadmin' || role === 'admin',
          },
        });
        permissions.push(created);
      }
    }

    return NextResponse.json({ permissions });
  } catch (error) {
    return NextResponse.json({ error: '권한을 불러오지 못했습니다.' }, { status: 500 });
  }
}
