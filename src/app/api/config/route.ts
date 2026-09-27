import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isMockMode, getMockScheduleFromDB } from '@/lib/mock-data';
import { logger } from '@/lib/logger'

/** GET - Public site config */
export async function GET() {
  try {
    // Use findUnique which should work with the generated client
    const config = await db.siteConfig.findUnique({ where: { id: 'default' } });

    if (config) {
      // 체험 기간을 반영한 유효 mockMode + 스케줄 함께 반환
      const [mockMode, schedule] = await Promise.all([
        isMockMode(),
        getMockScheduleFromDB(),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          siteName: config.siteName,
          siteDescription: config.siteDescription,
          layoutMode: config.layoutMode,
          language: config.language,
          mockMode,
          mockSchedule: schedule,
          maintenanceMode: config.maintenanceMode,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { siteName: 'AI 플랫폼', layoutMode: 'auto', mockMode: false, mockSchedule: null, maintenanceMode: false },
    });
  } catch (error) {
    logger.error('Config GET error:', error);
    return NextResponse.json({
      success: true,
      data: { mockMode: false, mockSchedule: null, layoutMode: 'auto' },
    });
  }
}

/** PUT - Update mockMode only (공개 접근 허용) */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { mockMode } = body;

    if (mockMode === undefined) {
      return NextResponse.json({ error: 'mockMode is required' }, { status: 400 });
    }

    const mockValue = Boolean(mockMode);

    await db.$executeRaw`
      INSERT INTO "SiteConfig" (id, "siteName", "siteDescription", "primaryColor", "layoutMode", language, "maintenanceMode", "mockMode", "updatedAt", "createdAt")
      VALUES ('default', 'AI 플랫폼', 'AI와 대화하고, 이미지를 변환하고, 미래를 예측하세요.', '', 'auto', 'ko', false, ${mockValue}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET "mockMode" = ${mockValue}, "updatedAt" = CURRENT_TIMESTAMP
    `;

    return NextResponse.json({
      success: true,
      data: { mockMode: Boolean(mockMode) },
    });
  } catch (error) {
    logger.error('Config PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
