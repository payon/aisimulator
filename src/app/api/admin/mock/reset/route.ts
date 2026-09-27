import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, hasPermission } from '@/lib/admin-auth';
import { checkAdminRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger'

// ============================================
// POST - 목업 데이터 초기화 (DB 항목 삭제 → 기본값 복원)
// ============================================

export async function POST(request: NextRequest) {
  const rl = checkAdminRateLimit(request);
  if (!rl.success) {
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  }
  // 인증 확인
  const session = authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  // 권한 확인
  const permitted = await hasPermission(session.role, 'canManageConfig');
  if (!permitted) {
    return NextResponse.json({ error: '설정 관리 권한이 없습니다.' }, { status: 403 });
  }

  try {
    // mock.* 키를 가진 모든 Content 항목 삭제
    const result = await db.content.deleteMany({
      where: { key: { startsWith: 'mock.' } },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `${result.count}개의 목업 데이터 항목이 삭제되어 기본값으로 복원됩니다.`,
    });
  } catch (error) {
    logger.error('Mock data reset error:', error);
    return NextResponse.json(
      { error: '목업 데이터 초기화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
