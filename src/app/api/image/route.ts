import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { callImageEdit } from '@/lib/ai-provider';
import { validateImageDataUrl } from '@/lib/cms-validate';
import { isMockMode, getMockImageMessageFromDB, getMockImageResultFromDB } from '@/lib/mock-data';
import { trackActivity } from '@/lib/activity';
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = checkRateLimit(`image:${ip}`, 10, 60);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { imageData, style } = body;

    if (!imageData || !style) {
      return NextResponse.json(
        { success: false, error: '이미지와 스타일을 선택해주세요.' },
        { status: 400 }
      );
    }

    // 서버측 MIME/크기 검증 (SVG/GIF 차단, 10MB 상한)
    const imgCheck = validateImageDataUrl(imageData);
    if (!imgCheck.valid) {
      return NextResponse.json({ success: false, error: imgCheck.error }, { status: 400 });
    }

    const allowedStyles = ['watercolor', 'oil', 'cartoon', 'vintage', 'anime', 'pencil'];
    if (!allowedStyles.includes(style)) {
      return NextResponse.json({ success: false, error: '지원하지 않는 스타일입니다.' }, { status: 400 });
    }

    // ===== Mock 모드 확인 (DB 기반 데이터 우선) =====
    const mockMode = await isMockMode();
    if (mockMode) {
      trackActivity('image_transform', 'image', { style, mockMode: true });
      const [mockMessage, preset] = await Promise.all([
        getMockImageMessageFromDB(),
        getMockImageResultFromDB(style),
      ]);
      return NextResponse.json({
        success: true,
        // 관리자가 등록한 체험 결과 이미지가 있으면 그것을, 없으면 원본 그대로
        // (원본인 경우 클라이언트가 Canvas 효과로 시연)
        transformedImage: preset || imageData,
        preset: Boolean(preset),
        message: mockMessage,
        timestamp: Date.now(),
        mockMode: true,
      });
    }

    // ===== 실제 AI 호출 =====
    const stylePrompts: Record<string, string> = {
      watercolor: 'Transform this image into a soft watercolor painting style with gentle brushstrokes and blended colors',
      oil: 'Transform this image into an oil painting style with rich textures and vibrant colors',
      cartoon: 'Transform this image into a cartoon style with bold outlines and bright colors',
      vintage: 'Transform this image into a vintage/retro photograph style with warm sepia tones',
      anime: 'Transform this image into an anime style illustration with clean lines and vibrant colors',
      pencil: 'Transform this image into a pencil sketch drawing style with fine crosshatching details',
    };

    const prompt = stylePrompts[style] || stylePrompts.watercolor;

    const transformedImage = await callImageEdit(prompt, imageData);

    if (!transformedImage) {
      return NextResponse.json(
        { success: false, error: '이미지 변환에 실패했습니다.' },
        { status: 500 }
      );
    }

    trackActivity('image_transform', 'image', { style, mockMode: false });
    return NextResponse.json({
      success: true,
      transformedImage,
      timestamp: Date.now(),
      mockMode: false,
    });
  } catch (error) {
    logger.error('Image API error:', error);
    return NextResponse.json(
      { success: false, error: '이미지 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
