import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateMessage, filterOutput } from '@/lib/security';
import { PRACTICE_SYSTEM_PROMPT } from '@/lib/prompts';
import { callChatCompletion } from '@/lib/ai-provider';
import { isMockMode, getMockPracticeResponseFromDB } from '@/lib/mock-data';
import { trackActivity } from '@/lib/activity';
import { logger } from '@/lib/logger'

/**
 * POST /api/practice
 * 예시 질문 체험 — 질문에 대한 답변 생성
 * 시뮬레이션 모드에서는 관리자가 등록한 mock 답변(DB 우선)을 반환
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = checkRateLimit(`practice:${ip}`, 30, 60);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { message, context } = body;

    const validation = validateMessage(message);
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    // ===== Mock 모드 확인 (DB 기반 데이터 우선) =====
    const mockMode = await isMockMode();
    if (mockMode) {
      trackActivity('practice_message', 'practice', { mockMode: true });
      const mockReply = await getMockPracticeResponseFromDB(message);
      return NextResponse.json({
        success: true,
        reply: mockReply,
        timestamp: Date.now(),
        mockMode: true,
      });
    }

    // ===== 실제 AI 호출 =====
    const messages = [{ role: 'system', content: PRACTICE_SYSTEM_PROMPT }];

    if (context && Array.isArray(context)) {
      const recentContext = context.slice(-5);
      for (const msg of recentContext) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user', content: message });

    const reply = await callChatCompletion(messages);
    trackActivity('practice_message', 'practice', { mockMode: false });

    const filtered = filterOutput(reply);
    return NextResponse.json({
      success: true,
      reply: filtered.safe ? filtered.filtered : filtered.filtered,
      timestamp: Date.now(),
      mockMode: false,
    });
  } catch (error) {
    logger.error('Practice API error:', error);
    return NextResponse.json(
      { success: false, error: 'AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
