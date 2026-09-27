// ============================================
// Mock 데이터 - 오프라인 시뮬레이션 모드
// AI 없이도 플랫폼이 어떻게 동작하는지 보여주기 위함
// ============================================

export const MOCK_CHAT_RESPONSES: Record<string, string> = {
  default: `안녕하세요! 저는 AI 교사입니다. 😊

현재 시뮬레이션 모드로 동작하고 있어요. 실제 AI 대화가 아닌, 미리 준비된 답변을 보여드립니다.

**시뮬레이션 모드에서도 이렇게 동작합니다:**
• 질문에 대한 답변을 생성합니다
• 이전 대화 내용을 기억합니다
• 음성으로 답변을 들려줍니다

실제 AI를 사용하려면 설정에서 API 키를 입력하고, 시뮬레이션 모드를 끄세요!`,

  greeting: `안녕하세요! 반갑습니다! 😊

저는 AI 교사입니다. 궁금한 것이 있으시면 무엇이든 물어보세요.

**이렇게 질문할 수 있어요:**
• "AI란 무엇인가요?"
• "스마트폰은 어떻게 사용하나요?"
• "건강하게 사는 법 알려주세요"`,

  ai_question: `좋은 질문이네요! AI(인공지능)에 대해 설명해드릴게요.

**AI란 무엇인가?**
AI는 컴퓨터가 사람처럼 생각하고 배우는 기술입니다.

**우리 생활에서의 AI:**
• 스마트폰의 음성 비서 (시리, 빅스비)
• 넷플릭스/유튜브 추천 영상
• 내비게이션 최적 경로 안내
• 번역 앱

**걱정하지 마세요!**
AI가 사람을 대체하는 것이 아니라, 사람을 돕는 도구입니다. 특히 시니어분들에게는 건강 관리, 정보 검색 등에 큰 도움이 됩니다.`,

  health: `건강 관리에 관심이 있으시군요! 💪

**시니어 건강 관리 5가지 핵심:**

1. **규칙적인 운동** - 하루 30분 걷기만으로도 충분합니다
2. **균형 잡힌 식사** - 채소, 단백질, 물을 충분히 드세요
3. **충분한 수면** - 7~8시간이 이상적입니다
4. **정기적 건강 검진** - 1년에 1번은 꼭 받으세요
5. **사회적 활동** - 가족, 친구와의 교류가 중요합니다

💡 **팁:** AI가 건강 정보를 찾아드릴 수 있어요! 언제든 물어보세요.`,

  smartphone: `스마트폰 사용법을 알려드릴게요! 📱

**기본 사용법:**
• **터치:** 가볍게 화면을 터치하세요
• **스와이프:** 화면을 밀어 올리거나 내리세요
• **홀드:** 길게 누르면 추가 메뉴가 나옵니다

**유용한 앱:**
• 카카오톡 - 가족과 대화
• 네이버 - 정보 검색
• 유튜브 - 영상 시청
• 카메라 - 사진 촬영

조급히 하지 마세요. 연습하면 자연스럽게 익숙해집니다! 😊`,
};

// 사용자 질문에 따른 Mock 응답 선택
export function getMockChatResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes('안녕') || msg.includes('하이') || msg.includes('hello')) {
    return MOCK_CHAT_RESPONSES.greeting;
  }
  if (msg.includes('ai') || msg.includes('인공지능') || msg.includes('에이아이')) {
    return MOCK_CHAT_RESPONSES.ai_question;
  }
  if (msg.includes('건강') || msg.includes('운동') || msg.includes('수면') || msg.includes('식사')) {
    return MOCK_CHAT_RESPONSES.health;
  }
  if (msg.includes('스마트') || msg.includes('폰') || msg.includes('핸드폰') || msg.includes('휴대폰')) {
    return MOCK_CHAT_RESPONSES.smartphone;
  }

  // 기본 응답 - 사용자 질문을 포함하여 자연스러운 느낌
  return `"${userMessage}"에 대해 답변드릴게요!

[시뮬레이션 모드] 현재 미리 준비된 답변을 보여드리고 있습니다.

실제 AI 모드에서는 이 질문에 대해 AI가 직접 답변을 생성합니다. 이렇게 다양한 주제에 대해 자유롭게 질문하고 답변을 받을 수 있어요.

**시뮬레이션에서도 확인할 수 있는 것:**
✅ 질문에 대한 답변 생성
✅ 음성으로 답변 듣기 (🔊 버튼)
✅ 대화 내용 유지
✅ 음성으로 질문하기 (🎤 버튼)

실제 AI를 사용하려면 설정에서 API 키를 입력하세요!`;
}

// Mock 퀴즈 데이터
export const MOCK_QUIZ_DATA: Record<string, Array<{
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: string;
  category: string;
}>> = {
  easy: [
    {
      id: 1,
      question: 'AI의 한국어 의미는 무엇인가요?',
      options: ['인공지능', '자연지능', '가상지능', '디지털지능'],
      correctAnswer: 0,
      explanation: 'AI는 Artificial Intelligence의 약자로, 한국어로는 "인공지능"입니다.',
      difficulty: 'easy',
      category: 'AI 기초',
    },
    {
      id: 2,
      question: '스마트폰에서 음성 명령을 내릴 수 있는 기능을 무엇이라 하나요?',
      options: ['음성 비서', '문자 메시지', '전화 걸기', '사진 찍기'],
      correctAnswer: 0,
      explanation: '시리, 빅스비, 구글 어시스턴트 등이 음성 비서입니다.',
      difficulty: 'easy',
      category: 'AI 활용',
    },
    {
      id: 3,
      question: 'AI가 우리 생활에서 가장 많이 쓰이는 분야는?',
      options: ['추천 시스템 (영화, 음악)', '우주 탐사', '심해 잠수', '농업'],
      correctAnswer: 0,
      explanation: '넷플릭스, 유튜브, 쇼핑몰 등의 추천이 가장 친숙한 AI 활용입니다.',
      difficulty: 'easy',
      category: 'AI 활용',
    },
    {
      id: 4,
      question: '챗봇(Chatbot)은 무엇인가요?',
      options: ['대화하는 컴퓨터 프로그램', '그림 그리는 로봇', '음악 연주 기계', '요리하는 기계'],
      correctAnswer: 0,
      explanation: '챗봇은 사람과 대화할 수 있는 AI 프로그램입니다. 카카오톡 챗봇이 대표적입니다.',
      difficulty: 'easy',
      category: 'AI 기초',
    },
    {
      id: 5,
      question: 'AI가 생성할 수 없는 것은?',
      options: ['감정을 느끼는 것', '글쓰기', '그림 그리기', '번역하기'],
      correctAnswer: 0,
      explanation: 'AI는 글, 그림, 번역을 할 수 있지만, 실제로 감정을 느끼지는 못합니다.',
      difficulty: 'easy',
      category: 'AI 윤리',
    },
  ],
  medium: [
    {
      id: 1,
      question: '머신러닝과 딥러닝의 관계로 올바른 것은?',
      options: ['딥러닝은 머신러닝의 한 종류이다', '둘은 전혀 다른 기술이다', '머신러닝이 딥러닝의 종류이다', '같은 기술의 다른 이름이다'],
      correctAnswer: 0,
      explanation: '딥러닝은 머신러닝의 하위 분류로, 신경망을 깊게 쌓아 올린 방식입니다.',
      difficulty: 'medium',
      category: 'AI 기초',
    },
    {
      id: 2,
      question: 'ChatGPT가 사용하는 기술의 핵심은?',
      options: ['대형 언어 모델 (LLM)', '이미지 인식', '음성 합성', '로봇 제어'],
      correctAnswer: 0,
      explanation: 'ChatGPT는 GPT라는 대형 언어 모델을 기반으로 합니다.',
      difficulty: 'medium',
      category: 'AI 활용',
    },
    {
      id: 3,
      question: 'AI의 편향성(Bias) 문제란?',
      options: ['AI가 특정 그룹에 불이익한 결과를 내는 것', 'AI가 너무 느린 것', 'AI가 너무 비싼 것', 'AI가 고장나는 것'],
      correctAnswer: 0,
      explanation: '학습 데이터의 편향이 AI 결과에 반영되어 차별이 발생할 수 있습니다.',
      difficulty: 'medium',
      category: 'AI 윤리',
    },
    {
      id: 4,
      question: '자연어 처리(NLP)의 예로 올바른 것은?',
      options: ['기계 번역', '얼굴 인식', '자율 주행', '재고 관리'],
      correctAnswer: 0,
      explanation: 'NLP는 사람의 언어를 컴퓨터가 이해하고 처리하는 기술입니다.',
      difficulty: 'medium',
      category: 'AI 기초',
    },
    {
      id: 5,
      question: 'AI가 생성한 결과물의 저작권은?',
      options: ['아직 법적으로 명확하지 않다', 'AI가 가진다', '사용자가 무조건 가진다', '아무도 가질 수 없다'],
      correctAnswer: 0,
      explanation: 'AI 생성물의 저작권은 각국마다 입장이 다르며, 아직 명확한 합의가 없습니다.',
      difficulty: 'medium',
      category: 'AI 윤리',
    },
  ],
  hard: [
    {
      id: 1,
      question: '트랜스포머(Transformer) 아키텍처의 핵심 메커니즘은?',
      options: ['Self-Attention', 'CNN', 'RNN', 'GAN'],
      correctAnswer: 0,
      explanation: 'Transformer는 Self-Attention 메커니즘을 통해 입력 시퀀스의 모든 위치 간 관계를 동시에 계산합니다.',
      difficulty: 'hard',
      category: 'AI 기초',
    },
    {
      id: 2,
      question: '그래디언트 소실 문제(Gradient Vanishing)가 발생하기 쉬운 구조는?',
      options: ['깊은 RNN', '얕은 신경망', '결정 트리', '서포트 벡터 머신'],
      correctAnswer: 0,
      explanation: 'RNN에서 역전파 시 그래디언트가 점차 작아져 학습이 어려워집>는 문제입니다.',
      difficulty: 'hard',
      category: 'AI 기초',
    },
    {
      id: 3,
      question: 'RLHF(인간 피드백 기반 강화학습)의 목적은?',
      options: ['AI 출력을 인간의 선호에 맞추는 것', 'AI를 더 빠르게 만드는 것', 'AI를 더 작게 만드는 것', 'AI의 에러를 0으로 만드는 것'],
      correctAnswer: 0,
      explanation: 'RLHF는 인간의 피드백으로 AI 모델을 미세 조정하여 더 안전하고 유용한 답변을 유도합니다.',
      difficulty: 'hard',
      category: 'AI 윤리',
    },
    {
      id: 4,
      question: '잠재 확산 모델(Latent Diffusion)이 이미지 생성에 사용하는 공간은?',
      options: ['잠재 공간 (Latent Space)', '색상 공간 (RGB)', '주파수 공간 (Fourier)', '픽셀 공간 (Pixel)'],
      correctAnswer: 0,
      explanation: '잠재 확산 모델은 픽셀 공간이 아닌 잠재 공간에서 노이즈8을 점>차 제거하>여 이미지를 생성합니다.',
      difficulty: 'hard',
      category: 'AI 활용',
    },
    {
      id: 5,
      question: 'Constitutional AI의 핵심 개념은?',
      options: ['AI 스스로 원칙에 따라 출력을 수정하는 것', '헌법에 AI 규제를 명시하는 것', 'AI 모델을 국가가 통제하는 것', 'AI의 권리를 보장하는 것'],
      correctAnswer: 0,
      explanation: 'Constitutional AI는 사전에 정의된 원칙(Constitution)에 따라 AI가 자신의 출력을 평가하고 수정합니다.',
      difficulty: 'hard',
      category: 'AI 윤리',
    },
  ],
};

// Mock 미래의 나 결과
export const MOCK_FUTURE_SELF = {
  healthTips: [
    '하루 30분 이상 걷기 운동을 하세요 - 심혈관 건강에 좋습니다',
    '매일 7-8시간 수면을 취하세요 - 뇌 건강에 필수적입니다',
    '소금과 설탕 섭취를 줄이세요 - 만성질환 예방에 도움이 됩니다',
    '정기적으로 건강검진을 받으세요 - 조기 발견이 중요합니다',
    '가족 및 친구와 자주 만나세요 - 사회적 연결이 건강에 좋습니다',
  ],
  message: `시뮬레이션 모드에서는 미래의 모습을 실제로 생성하지 않습니다.

실제 AI 모드에서는:
• 사진을 분석하여 미래 모습을 생성합니다
• 나이에 맞는 건강 팁을 제공합니다
• 자연스러운 노화 효과를 적용합니다

지금은 건강 팁만 확인할 수 있어요! 💪`,
};

// Mock 이미지 변환 결과 메시지
export const MOCK_IMAGE_MESSAGE = `📷 시뮬레이션 모드에서는 이미지 변환을 실제로 수행하지 않습니다.

**실제 AI 모드에서 가능한 변환:**
• 수채화风格 - 부드러운 붓터치
• 만화风格 - 선명한 윤곽선
• 애니메이션风格 - 깔끔한 선과 색
• 빈티지风格 - 옛날 사진 느낌
• 유화风格 - 풍부한 질감
• 연필 스케치 - 연필 드로잉

**시뮬레이션에서도 확인할 수 있는 것:**
✅ 스타일 선택 방법
✅ 이미지 업-로드 과정
✅ 변환 결과 표시 방식

실제 변환을 원하시면 설정에서 API 키를 입력하세요!`;

// Mock 모드 상태 확인 (서버 사이드)
// 체험 기간(mock.schedule)이 설정되어 있으면 기간 내일 때만 true
export async function isMockMode(now: Date = new Date()): Promise<boolean> {
  try {
    const { db } = await import('@/lib/db');
    // Raw SQL로 직접 확인 (Prisma client cache 문제 회피)
    const result = await db.$queryRawUnsafe(
      `SELECT "mockMode" FROM "SiteConfig" WHERE id = 'default'`
    ) as Array<{ mockMode: number | boolean }>;
    if (!result || result.length === 0) return false;
    const flag = result[0].mockMode;
    if (flag !== true && Number(flag) !== 1) return false;
    const schedule = await getMockScheduleFromDB();
    if (!schedule) return true;
    return isMockScheduleActive(schedule, now);
  } catch {
    return false;
  }
}

// ============================================
// DB 기반 Mock 데이터 로더
// 관리자가 Content 모델에 저장한 mock 데이터를 우선 사용,
// 없으면 기본 내장 mock 데이터를 사용
// ============================================

async function getMockContentFromDB(key: string): Promise<string | null> {
  try {
    const { db } = await import('@/lib/db');
    const content = await db.content.findUnique({ where: { key } });
    return content?.value || null;
  } catch {
    return null;
  }
}

// DB에서 채팅 mock 응답 가져오기 (없으면 기본값)
export async function getMockChatResponseFromDB(userMessage: string): Promise<string> {
  const msg = userMessage.toLowerCase();

  // 키 매핑
  let key = 'mock.chat.default';
  if (msg.includes('안녕') || msg.includes('하이') || msg.includes('hello')) {
    key = 'mock.chat.greeting';
  } else if (msg.includes('ai') || msg.includes('인공지능') || msg.includes('에이아이')) {
    key = 'mock.chat.ai_question';
  } else if (msg.includes('건강') || msg.includes('운동') || msg.includes('수면') || msg.includes('식사')) {
    key = 'mock.chat.health';
  } else if (msg.includes('스마트') || msg.includes('폰') || msg.includes('핸드폰') || msg.includes('휴대폰')) {
    key = 'mock.chat.smartphone';
  }

  // DB에서 먼저 찾기
  const dbValue = await getMockContentFromDB(key);
  if (dbValue) return dbValue;

  // 기본값 반환
  return getMockChatResponse(userMessage);
}

// DB에서 퀴즈 mock 데이터 가져오기
export async function getMockQuizDataFromDB(difficulty: string): Promise<typeof MOCK_QUIZ_DATA.easy> {
  const key = `mock.quiz.${difficulty}`;
  const dbValue = await getMockContentFromDB(key);
  if (dbValue) {
    try {
      const parsed = JSON.parse(dbValue);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* ignore */ }
  }
  return MOCK_QUIZ_DATA[difficulty] || MOCK_QUIZ_DATA.easy;
}

// DB에서 이미지 mock 메시지 가져오기
export async function getMockImageMessageFromDB(): Promise<string> {
  const dbValue = await getMockContentFromDB('mock.image.message');
  return dbValue || MOCK_IMAGE_MESSAGE;
}

// DB에서 미래의 나 mock 데이터 가져오기
export async function getMockFutureSelfFromDB(): Promise<{ healthTips: string[]; message: string }> {
  const [tipsValue, msgValue] = await Promise.all([
    getMockContentFromDB('mock.future.healthTips'),
    getMockContentFromDB('mock.future.message'),
  ]);

  let healthTips = MOCK_FUTURE_SELF.healthTips;
  if (tipsValue) {
    try {
      const parsed = JSON.parse(tipsValue);
      if (Array.isArray(parsed)) healthTips = parsed;
    } catch { /* ignore */ }
  }

  return {
    healthTips,
    message: msgValue || MOCK_FUTURE_SELF.message,
  };
}

// ============================================
// 체험 결과 이미지 (관리자가 업로드한 프리셋)
// 키 규약:
//   mock.image.result.{style}  (watercolor/oil/cartoon/vintage/anime/pencil)
//   mock.future.result.{age}   (60/70/80/90)
// 값이 없으면 null → 클라이언트 Canvas 효과 폴백
// ============================================

export async function getMockImageResultFromDB(style: string): Promise<string | null> {
  const v = await getMockContentFromDB(`mock.image.result.${style}`);
  return v && v.trim().length > 0 ? v : null;
}

export async function getMockFutureResultFromDB(age: number | string): Promise<string | null> {
  const v = await getMockContentFromDB(`mock.future.result.${age}`);
  return v && v.trim().length > 0 ? v : null;
}

// ============================================
// 체험 기간 (관리자가 설정, 없으면 상시)
// mock.schedule (json): { startAt: ISO|null, endAt: ISO|null, note: string }
// ============================================

export interface MockSchedule {
  startAt: string | null;
  endAt: string | null;
  note: string;
}

export async function getMockScheduleFromDB(): Promise<MockSchedule | null> {
  const v = await getMockContentFromDB('mock.schedule');
  if (!v) return null;
  try {
    const parsed = JSON.parse(v);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const startAt = typeof parsed.startAt === 'string' && parsed.startAt ? parsed.startAt : null;
    const endAt = typeof parsed.endAt === 'string' && parsed.endAt ? parsed.endAt : null;
    if (!startAt && !endAt) return null;
    return {
      startAt,
      endAt,
      note: typeof parsed.note === 'string' ? parsed.note : '',
    };
  } catch {
    return null;
  }
}

export function isMockScheduleActive(schedule: MockSchedule | null, now: Date = new Date()): boolean {
  if (!schedule) return true;
  const t = now.getTime();
  if (schedule.startAt) {
    const s = new Date(schedule.startAt).getTime();
    if (!Number.isNaN(s) && t < s) return false;
  }
  if (schedule.endAt) {
    const e = new Date(schedule.endAt).getTime();
    if (!Number.isNaN(e) && t > e) return false;
  }
  return true;
}
