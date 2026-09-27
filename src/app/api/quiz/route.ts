import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { callChatCompletion } from '@/lib/ai-provider';
import { isMockMode, getMockQuizDataFromDB } from '@/lib/mock-data';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = checkRateLimit(`quiz:${ip}`, 20, 60);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { difficulty = 'easy', count = 5 } = body;

    // ===== Mock 모드 확인 (DB 기반 데이터 우선) =====
    const mockMode = await isMockMode();
    if (mockMode) {
      const mockQuestions = await getMockQuizDataFromDB(difficulty);
      return NextResponse.json({
        success: true,
        questions: mockQuestions.slice(0, count),
        timestamp: Date.now(),
        mockMode: true,
      });
    }

    // ===== 실제 AI 호출 =====
    const difficultyMap: Record<string, string> = {
      easy: '입문자 수준의 아주 쉬운',
      medium: '중급자 수준의',
      hard: '전문가 수준의 어려운',
    };

    const completion = await callChatCompletion([
      {
        role: 'system',
        content: `당신은 AI 교육 퀴즈 출제자입니다. ${difficultyMap[difficulty] || difficultyMap.easy} AI 관련 퀴즈 ${count}개를 만들어주세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
[
  {
    "id": 1,
    "question": "질문 내용",
    "options": ["보기1", "보기2", "보기3", "보기4"],
    "correctAnswer": 0,
    "explanation": "해설 내용",
    "difficulty": "${difficulty}",
    "category": "AI 기초"
  }
]

규칙:
- 한국어로 작성
- 시니어가 이해할 수 있는 쉬운 언어 사용
- correctAnswer는 0~3 중 하나 (보기 인덱스)
- 카테고리는 AI 기초, AI 활용, AI 윤리 중 하나`,
      },
      { role: 'user', content: `${difficultyMap[difficulty]} AI 퀴즈 ${count}개를 출제해주세요.` },
    ]);

    const jsonMatch = completion.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ success: false, error: '퀴즈 생성에 실패했습니다.' }, { status: 500 });
    }

    const questions = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      questions,
      timestamp: Date.now(),
      mockMode: false,
    });
  } catch (error) {
    console.error('Quiz API error:', error);
    return NextResponse.json({ success: false, error: '퀴즈를 불러오는데 실패했습니다.' }, { status: 500 });
  }
}
