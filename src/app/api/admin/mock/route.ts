import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, hasPermission } from '@/lib/admin-auth';
import { checkAdminRateLimit } from '@/lib/rate-limit';
import { isAllowedUrlValue } from '@/lib/cms-validate';
import { logger } from '@/lib/logger';
import {
  MOCK_CHAT_RESPONSES,
  MOCK_QUIZ_DATA,
  MOCK_FUTURE_SELF,
  MOCK_IMAGE_MESSAGE,
} from '@/lib/mock-data';

// ============================================
// 목업 데이터 키 정의
// ============================================

const IMAGE_RESULT_STYLES = ['watercolor', 'oil', 'cartoon', 'vintage', 'anime', 'pencil'];
const FUTURE_RESULT_AGES = ['60', '70', '80', '90'];

const MOCK_KEYS = {
  'mock.chat.greeting': () => MOCK_CHAT_RESPONSES.greeting,
  'mock.chat.ai_question': () => MOCK_CHAT_RESPONSES.ai_question,
  'mock.chat.health': () => MOCK_CHAT_RESPONSES.health,
  'mock.chat.smartphone': () => MOCK_CHAT_RESPONSES.smartphone,
  'mock.chat.default': () => MOCK_CHAT_RESPONSES.default,
  'mock.image.message': () => MOCK_IMAGE_MESSAGE,
  'mock.future.message': () => MOCK_FUTURE_SELF.message,
  'mock.future.healthTips': () => JSON.stringify(MOCK_FUTURE_SELF.healthTips),
  'mock.quiz.easy': () => JSON.stringify(MOCK_QUIZ_DATA.easy),
  'mock.quiz.medium': () => JSON.stringify(MOCK_QUIZ_DATA.medium),
  'mock.quiz.hard': () => JSON.stringify(MOCK_QUIZ_DATA.hard),
  'mock.schedule': () => '',
  ...Object.fromEntries(IMAGE_RESULT_STYLES.map((s) => [`mock.image.result.${s}`, () => ''])),
  ...Object.fromEntries(FUTURE_RESULT_AGES.map((a) => [`mock.future.result.${a}`, () => ''])),
} as const;

function adminLimited(request: NextRequest) {
  const rl = checkAdminRateLimit(request);
  if (!rl.success) {
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  }
  return null;
}

// ============================================
// GET - 목업 데이터 조회
// ============================================

export async function GET(request: NextRequest) {
  const limited = adminLimited(request);
  if (limited) return limited;
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
    // DB에서 mock.* 키 조회
    const dbEntries = await db.content.findMany({
      where: { key: { startsWith: 'mock.' } },
    });

    const dbMap = new Map(dbEntries.map((e) => [e.key, e.value]));

    // 기본값과 병합 (DB 값이 우선)
    const mockData: Record<string, string> = {};
    for (const [key, defaultFn] of Object.entries(MOCK_KEYS)) {
      mockData[key] = dbMap.get(key) ?? defaultFn();
    }

    // 구조화된 형태로 변환
    const pickResults = (prefix: string, ids: string[]) => {
      const out: Record<string, string> = {};
      for (const id of ids) out[id] = mockData[`${prefix}.${id}`] || '';
      return out;
    };
    let schedule: { startAt: string | null; endAt: string | null; note: string } | null = null;
    try {
      const parsed = mockData['mock.schedule'] ? JSON.parse(mockData['mock.schedule']) : null;
      if (parsed && typeof parsed === 'object') {
        schedule = {
          startAt: typeof parsed.startAt === 'string' && parsed.startAt ? parsed.startAt : null,
          endAt: typeof parsed.endAt === 'string' && parsed.endAt ? parsed.endAt : null,
          note: typeof parsed.note === 'string' ? parsed.note : '',
        };
        if (!schedule.startAt && !schedule.endAt) schedule = null;
      }
    } catch { schedule = null; }
    const structured = {
      chat: {
        greeting: mockData['mock.chat.greeting'],
        ai_question: mockData['mock.chat.ai_question'],
        health: mockData['mock.chat.health'],
        smartphone: mockData['mock.chat.smartphone'],
        default: mockData['mock.chat.default'],
      },
      image: {
        message: mockData['mock.image.message'],
        results: pickResults('mock.image.result', IMAGE_RESULT_STYLES),
      },
      future: {
        message: mockData['mock.future.message'],
        healthTips: JSON.parse(mockData['mock.future.healthTips']),
        results: pickResults('mock.future.result', FUTURE_RESULT_AGES),
      },
      quiz: {
        easy: JSON.parse(mockData['mock.quiz.easy']),
        medium: JSON.parse(mockData['mock.quiz.medium']),
        hard: JSON.parse(mockData['mock.quiz.hard']),
      },
      schedule,
    };

    return NextResponse.json({ mockData: structured, raw: mockData });
  } catch (error) {
    logger.error('Mock data GET error:', error);
    return NextResponse.json(
      { error: '목업 데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - 목업 데이터 저장
// ============================================

export async function POST(request: NextRequest) {
  const limited = adminLimited(request);
  if (limited) return limited;
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
    const body = await request.json();
    const { mockData } = body;

    if (!mockData) {
      return NextResponse.json(
        { error: 'mockData가 필요합니다.' },
        { status: 400 }
      );
    }

    // 구조화된 데이터를 키-값 쌍으로 변환
    const entries: { key: string; value: string; category: string; type: string }[] = [];

    // 채팅 응답
    if (mockData.chat) {
      const chatCategories: Record<string, string> = {
        greeting: 'mock.chat.greeting',
        ai_question: 'mock.chat.ai_question',
        health: 'mock.chat.health',
        smartphone: 'mock.chat.smartphone',
        default: 'mock.chat.default',
      };
      for (const [field, key] of Object.entries(chatCategories)) {
        if (mockData.chat[field] !== undefined) {
          entries.push({ key, value: mockData.chat[field], category: 'chat', type: 'rich_text' });
        }
      }
    }

    // 이미지 메시지
    if (mockData.image?.message !== undefined) {
      entries.push({ key: 'mock.image.message', value: mockData.image.message, category: 'image', type: 'rich_text' });
    }

    // 이미지 스타일별 체험 결과 이미지 (빈 문자열 = 미설정)
    if (mockData.image?.results && typeof mockData.image.results === 'object') {
      for (const style of IMAGE_RESULT_STYLES) {
        const url = mockData.image.results[style];
        if (url !== undefined) {
          const v = String(url).trim();
          if (v && !isAllowedUrlValue('image', v)) {
            return NextResponse.json({ error: `허용되지 않은 이미지 URL입니다 (${style})` }, { status: 400 });
          }
          entries.push({ key: `mock.image.result.${style}`, value: v, category: 'mock', type: 'image' });
        }
      }
    }

    // 미래의 나
    if (mockData.future?.message !== undefined) {
      entries.push({ key: 'mock.future.message', value: mockData.future.message, category: 'future', type: 'rich_text' });
    }
    if (mockData.future?.healthTips !== undefined) {
      entries.push({
        key: 'mock.future.healthTips',
        value: JSON.stringify(mockData.future.healthTips),
        category: 'future',
        type: 'json',
      });
    }

    // 미래 나이별 체험 결과 이미지 (빈 문자열 = 미설정)
    if (mockData.future?.results && typeof mockData.future.results === 'object') {
      for (const age of FUTURE_RESULT_AGES) {
        const url = mockData.future.results[age];
        if (url !== undefined) {
          const v = String(url).trim();
          if (v && !isAllowedUrlValue('image', v)) {
            return NextResponse.json({ error: `허용되지 않은 이미지 URL입니다 (${age}대)` }, { status: 400 });
          }
          entries.push({ key: `mock.future.result.${age}`, value: v, category: 'mock', type: 'image' });
        }
      }
    }

    // 체험 기간 (둘 다 비어 있으면 기간 미설정으로 저장)
    if (mockData.schedule !== undefined && mockData.schedule !== null) {
      const s = mockData.schedule;
      const startAt = typeof s.startAt === 'string' && s.startAt ? s.startAt : null;
      const endAt = typeof s.endAt === 'string' && s.endAt ? s.endAt : null;
      const note = typeof s.note === 'string' ? s.note.slice(0, 500) : '';
      if ((startAt && Number.isNaN(new Date(startAt).getTime())) || (endAt && Number.isNaN(new Date(endAt).getTime()))) {
        return NextResponse.json({ error: '체험 기간 날짜 형식이 올바르지 않습니다.' }, { status: 400 });
      }
      entries.push({
        key: 'mock.schedule',
        value: JSON.stringify({ startAt, endAt, note }),
        category: 'mock',
        type: 'json',
      });
    }

    // 퀴즈
    if (mockData.quiz?.easy !== undefined) {
      entries.push({ key: 'mock.quiz.easy', value: JSON.stringify(mockData.quiz.easy), category: 'quiz', type: 'json' });
    }
    if (mockData.quiz?.medium !== undefined) {
      entries.push({ key: 'mock.quiz.medium', value: JSON.stringify(mockData.quiz.medium), category: 'quiz', type: 'json' });
    }
    if (mockData.quiz?.hard !== undefined) {
      entries.push({ key: 'mock.quiz.hard', value: JSON.stringify(mockData.quiz.hard), category: 'quiz', type: 'json' });
    }

    // DB에 upsert
    for (const entry of entries) {
      await db.content.upsert({
        where: { key: entry.key },
        create: {
          key: entry.key,
          category: entry.category,
          type: entry.type,
          value: entry.value,
          label: entry.key.replace('mock.', ''),
          description: `시뮬레이션 목업 데이터: ${entry.key}`,
          updatedBy: session.userId,
        },
        update: {
          value: entry.value,
          updatedBy: session.userId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      savedKeys: entries.map((e) => e.key),
    });
  } catch (error) {
    logger.error('Mock data POST error:', error);
    return NextResponse.json(
      { error: '목업 데이터 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
