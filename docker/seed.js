// 최초 기동 시 1회 시드 (관리자/권한/사이트설정). 이미 데이터가 있으면 skip.
// CMS 콘텐츠는 프론트 fallback이 있어 필수가 아니므로 건드리지 않는다.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const PERMISSIONS = [
  { role: 'superadmin', canManageUsers: true, canManageContent: true, canManageConfig: true, canViewAudit: true, canDeleteContent: true, canManageAPIKeys: true, canManageNotifications: true, canExportData: true, canViewAnalytics: true },
  { role: 'admin', canManageUsers: true, canManageContent: true, canManageConfig: true, canViewAudit: true, canDeleteContent: true, canManageAPIKeys: false, canManageNotifications: true, canExportData: true, canViewAnalytics: true },
  { role: 'editor', canManageUsers: false, canManageContent: true, canManageConfig: false, canViewAudit: false, canDeleteContent: false, canManageAPIKeys: false, canManageNotifications: false, canExportData: false, canViewAnalytics: false },
  { role: 'viewer', canManageUsers: false, canManageContent: false, canManageConfig: false, canViewAudit: false, canDeleteContent: false, canManageAPIKeys: false, canManageNotifications: false, canExportData: false, canViewAnalytics: false },
];

async function main() {
  const db = new PrismaClient();
  try {
    const adminCount = await db.adminUser.count();
    if (adminCount > 0) {
      console.log('[seed] admin users exist, skipping.');
      return;
    }
    for (const p of PERMISSIONS) {
      await db.permission.upsert({ where: { role: p.role }, update: {}, create: p });
    }
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    await db.adminUser.create({
      data: {
        email: process.env.ADMIN_EMAIL || 'admin@aiplatform.kr',
        name: '슈퍼관리자',
        passwordHash,
        role: 'superadmin',
        isActive: true,
      },
    });
    await db.siteConfig.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } });
    console.log('[seed] initial data created (change admin password after login).');
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => { console.error('[seed] failed:', e); process.exit(1); });
