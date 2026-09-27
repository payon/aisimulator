import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { callChatCompletion } from '@/lib/ai-provider';
import { validateImageDataUrl } from '@/lib/cms-validate';
import { isMockMode, getMockFutureSelfFromDB, getMockFutureResultFromDB } from '@/lib/mock-data';
import { trackActivity } from '@/lib/activity';
import { logger } from '@/lib/logger'

const AGE_OPTIONS = [60, 70, 80, 90];

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = checkRateLimit(`future:${ip}`, 5, 120);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { imageData, targetAge } = body;

    if (!imageData || !targetAge) {
      return NextResponse.json(
        { success: false, error: '이미지와 나이를 선택해주세요.' },
        { status: 400 }
      );
    }

    // 서버측 입력 검증 (SVG/GIF 차단, 10MB 상한, 지원 나이)
    const imgCheck = validateImageDataUrl(imageData);
    if (!imgCheck.valid) {
      return NextResponse.json({ success: false, error: imgCheck.error }, { status: 400 });
    }
    if (!AGE_OPTIONS.includes(Number(targetAge))) {
      return NextResponse.json({ success: false, error: '지원하지 않는 나이입니다.' }, { status: 400 });
    }

    // ===== Mock 모드 확인 (DB 기반 데이터 우선) =====
    const mockMode = await isMockMode();
    if (mockMode) {
      trackActivity('future_generate', 'future', { targetAge, mockMode: true });
      const [mockFuture, preset] = await Promise.all([
        getMockFutureSelfFromDB(),
        getMockFutureResultFromDB(Number(targetAge)),
      ]);
      return NextResponse.json({
        success: true,
        // 관리자가 등록한 나이별 체험 이미지가 있으면 그것을, 없으면 원본 그대로
        futureImage: preset || imageData,
        preset: Boolean(preset),
        healthTips: mockFuture.healthTips,
        message: mockFuture.message,
        timestamp: Date.now(),
        mockMode: true,
      });
    }

    // ===== 실제 AI 호출 =====
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    const imageResponse = await zai.images.generations.edit({
      prompt: `Generate a realistic age-progressed version of this person showing how they might look at age ${targetAge}. Maintain facial features and identity while showing natural aging effects. Photorealistic style.`,
      images: [{ url: imageData }],
      size: '1024x1024',
    });

    const imageBase64 = imageResponse.data[0]?.base64;

    // Generate health tips using LLM
    const healthTipsReply = await callChatCompletion([
      {
        role: 'system',
        content: `당신은 건강 관리 전문가입니다. ${targetAge}대를 맞이하는 사람에게 건강 관리 팁을 알려주세요. 5가지 핵심 팁을 간결하게 작성해주세요. 시니어가 이해하기 쉬운 언어로 작성하세요. JSON 배열 형식으로만 응답하세요. 예: ["팁1", "팁2", ...]`,
      },
      { role: 'user', content: `${targetAge}대 건강 관리 팁 5가지를 알려주세요.` },
    ]);

    let healthTips: string[] = [
      '규칙적인 운동이 중요합니다',
      '균형 잡힌 식사를 하세요',
      '충분한 수면을 취하세요',
      '정기적 건강 검진을 받으세요',
      '긍정적인 마음을 유지하세요',
    ];

    try {
      const parsed = JSON.parse(healthTipsReply);
      if (Array.isArray(parsed) && parsed.length > 0) {
        healthTips = parsed.slice(0, 5);
      }
    } catch {
      // Use default tips if parsing fails
    }

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: '미래 모습 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    trackActivity('future_generate', 'future', { targetAge, mockMode: false });
    return NextResponse.json({
      success: true,
      futureImage: `data:image/png;base64,${imageBase64}`,
      healthTips,
      timestamp: Date.now(),
      mockMode: false,
    });
  } catch (error) {
    logger.error('Future Self API error:', error);
    return NextResponse.json(
      { success: false, error: '미래 모습 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
