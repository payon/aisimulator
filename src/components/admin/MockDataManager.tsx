'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  Save,
  RotateCcw,
  MessageSquare,
  ImageIcon,
  Sparkles,
  GraduationCap,
  CalendarClock,
  Loader2,
  Check,
  Plus,
  Trash2,
  Upload,
  X,
  Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { refreshCmsContent } from '@/hooks/use-cms-content';
import { ResponsiveImage } from '@/components/ui/responsive-image';
import { IMAGE_STYLES, AGE_OPTIONS } from '@/types';
import { toast } from 'sonner';

// ============================================
// 타입 정의
// ============================================

interface ChatResponses {
  greeting: string;
  ai_question: string;
  health: string;
  smartphone: string;
  default: string;
}

interface FutureSelfData {
  message: string;
  healthTips: string[];
}

interface MockSchedule {
  startAt: string | null;
  endAt: string | null;
  note: string;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: string;
  category: string;
}

interface QuizData {
  easy: QuizQuestion[];
  medium: QuizQuestion[];
  hard: QuizQuestion[];
}

interface PracticeExample {
  id: string;
  question: string;
  hint?: string;
}

interface PracticeData {
  examples: PracticeExample[];
  answers: Record<string, string>;
  default: string;
}

interface MockData {
  chat: ChatResponses;
  image: { message: string; results: Record<string, string> };
  future: FutureSelfData & { results: Record<string, string> };
  quiz: QuizData;
  practice: PracticeData;
  schedule: MockSchedule | null;
}

type MockTab = 'chat' | 'image' | 'future' | 'quiz' | 'practice' | 'period';

// ============================================
// 기본 목업 데이터
// ============================================

const DEFAULT_CHAT: ChatResponses = {
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

  default: `안녕하세요! 저는 AI 교사입니다. 😊

현재 시뮬레이션 모드로 동작하고 있어요. 실제 AI 대화가 아닌, 미리 준비된 답변을 보여드립니다.

**시뮬레이션 모드에서도 이렇게 동작합니다:**
• 질문에 대한 답변을 생성합니다
• 이전 대화 내용을 기억합니다
• 음성으로 답변을 들려줍니다

실제 AI를 사용하려면 설정에서 API 키를 입력하고, 시뮬레이션 모드를 끄세요!`,
};

const DEFAULT_IMAGE = {
  message: `📷 시뮬레이션 모드에서는 이미지 변환을 실제로 수행하지 않습니다.

**실제 AI 모드에서 가능한 변환:**
• 수채화风格 - 부드러운 붓터치
• 만화风格 - 선명한 윤곽선
• 애니메이션风格 - 깔끔한 선과 색
• 빈티지风格 - 옛날 사진 느낌
• 유화风格 - 풍부한 질감
• 연필 스케치 - 연필 드로잉

**시뮬레이션에서도 확인할 수 있는 것:**
✅ 스타일 선택 방법
✅ 이미지 업로드 과정
✅ 변환 결과 표시 방식

실제 변환을 원하시면 설정에서 API 키를 입력하세요!`,
};

const DEFAULT_FUTURE: FutureSelfData = {
  message: `시뮬레이션 모드에서는 미래의 모습을 실제로 생성하지 않습니다.

실제 AI 모드에서는:
• 사진을 분석하여 미래 모습을 생성합니다
• 나이에 맞는 건강 팁을 제공합니다
• 자연스러운 노화 효과를 적용합니다

지금은 건강 팁만 확인할 수 있어요! 💪`,
  healthTips: [
    '하루 30분 이상 걷기 운동을 하세요 - 심혈관 건강에 좋습니다',
    '매일 7-8시간 수면을 취하세요 - 뇌 건강에 필수적입니다',
    '소금과 설탕 섭취를 줄이세요 - 만성질환 예방에 도움이 됩니다',
    '정기적으로 건강검진을 받으세요 - 조기 발견이 중요합니다',
    '가족 및 친구와 자주 만나세요 - 사회적 연결이 건강에 좋습니다',
  ],
};

const DEFAULT_QUIZ: QuizData = {
  easy: [
    { id: 1, question: 'AI의 한국어 의미는 무엇인가요?', options: ['인공지능', '자연지능', '가상지능', '디지털지능'], correctAnswer: 0, explanation: 'AI는 Artificial Intelligence의 약자로, 한국어로는 "인공지능"입니다.', difficulty: 'easy', category: 'AI 기초' },
    { id: 2, question: '스마트폰에서 음성 명령을 내릴 수 있는 기능을 무엇이라 하나요?', options: ['음성 비서', '문자 메시지', '전화 걸기', '사진 찍기'], correctAnswer: 0, explanation: '시리, 빅스비, 구글 어시스턴트 등이 음성 비서입니다.', difficulty: 'easy', category: 'AI 활용' },
    { id: 3, question: 'AI가 우리 생활에서 가장 많이 쓰이는 분야는?', options: ['추천 시스템 (영화, 음악)', '우주 탐사', '심해 잠수', '농업'], correctAnswer: 0, explanation: '넷플릭스, 유튜브, 쇼핑몰 등의 추천이 가장 친숙한 AI 활용입니다.', difficulty: 'easy', category: 'AI 활용' },
    { id: 4, question: '챗봇(Chatbot)은 무엇인가요?', options: ['대화하는 컴퓨터 프로그램', '그림 그리는 로봇', '음악 연주 기계', '요리하는 기계'], correctAnswer: 0, explanation: '챗봇은 사람과 대화할 수 있는 AI 프로그램입니다. 카카오톡 챗봇이 대표적입니다.', difficulty: 'easy', category: 'AI 기초' },
    { id: 5, question: 'AI가 생성할 수 없는 것은?', options: ['감정을 느끼는 것', '글쓰기', '그림 그리기', '번역하기'], correctAnswer: 0, explanation: 'AI는 글, 그림, 번역을 할 수 있지만, 실제로 감정을 느끼지는 못합니다.', difficulty: 'easy', category: 'AI 윤리' },
  ],
  medium: [
    { id: 1, question: '머신러닝과 딥러닝의 관계로 올바른 것은?', options: ['딥러닝은 머신러닝의 한 종류이다', '둘은 전혀 다른 기술이다', '머신러닝이 딥러닝의 종류이다', '같은 기술의 다른 이름이다'], correctAnswer: 0, explanation: '딥러닝은 머신러닝의 하위 분류로, 신경망을 깊게 쌓아 올린 방식입니다.', difficulty: 'medium', category: 'AI 기초' },
    { id: 2, question: 'ChatGPT가 사용하는 기술의 핵심은?', options: ['대형 언어 모델 (LLM)', '이미지 인식', '음성 합성', '로봇 제어'], correctAnswer: 0, explanation: 'ChatGPT는 GPT라는 대형 언어 모델을 기반으로 합니다.', difficulty: 'medium', category: 'AI 활용' },
    { id: 3, question: 'AI의 편향성(Bias) 문제란?', options: ['AI가 특정 그룹에 불이익한 결과를 내는 것', 'AI가 너무 느린 것', 'AI가 너무 비싼 것', 'AI가 고장나는 것'], correctAnswer: 0, explanation: '학습 데이터의 편향이 AI 결과에 반영되어 차별이 발생할 수 있습니다.', difficulty: 'medium', category: 'AI 윤리' },
    { id: 4, question: '자연어 처리(NLP)의 예로 올바른 것은?', options: ['기계 번역', '얼굴 인식', '자율 주행', '재고 관리'], correctAnswer: 0, explanation: 'NLP는 사람의 언어를 컴퓨터가 이해하고 처리하는 기술입니다.', difficulty: 'medium', category: 'AI 기초' },
    { id: 5, question: 'AI가 생성한 결과물의 저작권은?', options: ['아직 법적으로 명확하지 않다', 'AI가 가진다', '사용자가 무조건 가진다', '아무도 가질 수 없다'], correctAnswer: 0, explanation: 'AI 생성물의 저작권은 각국마다 입장이 다르며, 아직 명확한 합의가 없습니다.', difficulty: 'medium', category: 'AI 윤리' },
  ],
  hard: [
    { id: 1, question: '트랜스포머(Transformer) 아키텍처의 핵심 메커니즘은?', options: ['Self-Attention', 'CNN', 'RNN', 'GAN'], correctAnswer: 0, explanation: 'Transformer는 Self-Attention 메커니즘을 통해 입력 시퀀스의 모든 위치 간 관계를 동시에 계산합니다.', difficulty: 'hard', category: 'AI 기초' },
    { id: 2, question: '그래디언트 소실 문제(Gradient Vanishing)가 발생하기 쉬운 구조는?', options: ['깊은 RNN', '얕은 신경망', '결정 트리', '서포트 벡터 머신'], correctAnswer: 0, explanation: 'RNN에서 역전파 시 그래디언트가 점차 작아져 학습이 어려워지는 문제입니다.', difficulty: 'hard', category: 'AI 기초' },
    { id: 3, question: 'RLHF(인간 피드백 기반 강화학습)의 목적은?', options: ['AI 출력을 인간의 선호에 맞추는 것', 'AI를 더 빠르게 만드는 것', 'AI를 더 작게 만드는 것', 'AI의 에러를 0으로 만드는 것'], correctAnswer: 0, explanation: 'RLHF는 인간의 피드백으로 AI 모델을 미세 조정하여 더 안전하고 유용한 답변을 유도합니다.', difficulty: 'hard', category: 'AI 윤리' },
    { id: 4, question: '잠재 확산 모델(Latent Diffusion)이 이미지 생성에 사용하는 공간은?', options: ['잠재 공간 (Latent Space)', '색상 공간 (RGB)', '주파수 공간 (Fourier)', '픽셀 공간 (Pixel)'], correctAnswer: 0, explanation: '잠재 확산 모델은 픽셀 공간이 아닌 잠재 공간에서 노이즈를 점차 제거하여 이미지를 생성합니다.', difficulty: 'hard', category: 'AI 활용' },
    { id: 5, question: 'Constitutional AI의 핵심 개념은?', options: ['AI 스스로 원칙에 따라 출력을 수정하는 것', '헌법에 AI 규제를 명시하는 것', 'AI 모델을 국가가 통제하는 것', 'AI의 권리를 보장하는 것'], correctAnswer: 0, explanation: 'Constitutional AI는 사전에 정의된 원칙(Constitution)에 따라 AI가 자신의 출력을 평가하고 수정합니다.', difficulty: 'hard', category: 'AI 윤리' },
  ],
};

const DEFAULT_PRACTICE: PracticeData = {
  examples: [
    { id: 'what-is-ai', question: 'AI란 무엇인가요?', hint: '가장 기본적인 질문이에요' },
    { id: 'chatgpt-how', question: 'ChatGPT는 어떻게 사용하나요?', hint: '대표 서비스 이용법' },
    { id: 'app-install', question: '스마트폰에 AI 앱을 어떻게 설치하나요?', hint: '앱 설치 안내' },
    { id: 'good-question', question: 'AI에게 좋은 질문을 하려면 어떻게 해야 하나요?', hint: '질문 잘하는 법' },
    { id: 'health-info', question: '건강 정보를 AI에게 물어봐도 되나요?', hint: '생활 속 활용' },
  ],
  answers: {
    'AI란 무엇인가요?': `좋은 질문이에요! 😊

**AI(인공지능)란?**
컴퓨터가 사람처럼 배우고 생각하는 기술이에요. 계산기처럼 정해진 답만 내는 게 아니라, 대화를 통해 새로운 답을 만들어냅니다.

**생활 속 예시:**
• 스마트폰 음성 비서 (시리, 빅스비)
• 유튜브·넷플릭스 추천 영상
• 사진 속 글자를 읽어주는 번역 앱

직접 한 번 따라해 보세요 → "AI로 무엇을 할 수 있나요?"라고 물어보세요!`,
    'ChatGPT는 어떻게 사용하나요?': `ChatGPT 사용법을 알려드릴게요! 💬

1. **앱 설치** — 스마트폰 앱스토어에서 "ChatGPT"를 검색해 설치하세요
2. **가입** — 이메일이나 구글·애플 계정으로 가입하세요
3. **질문** — 아래 입력창에 궁금한 것을 쓰고 보내기(➤)를 누르세요
4. **대화** — 답변이 오면 이어서 "더 쉽게 설명해줘"라고 물어보세요

💡 **팁:** 처음엔 짧은 질문부터 시작하세요. 예) "오늘 날씨에 맞는 옷차림 알려줘"`,
    '스마트폰에 AI 앱을 어떻게 설치하나요?': `스마트폰 앱 설치, 천천히 따라해 보세요! 📱

**안드로이드(삼성 등):**
1. Play 스토어 앱을 여세요
2. 위 검색창에 "ChatGPT" 또는 "Gemini" 입력
3. [설치] 버튼을 누르세요
4. 설치가 끝나면 [열기]를 누르세요

**아이폰:**
1. App Store 앱을 여세요
2. 하단 [검색] → "ChatGPT" 입력
3. [받기] → 얼굴 인식·비밀번호로 확인

⚠️ **주의:** 이름이 비슷해도 제작사가 "OpenAI", "Google"인지 꼭 확인하세요!`,
    'AI에게 좋은 질문을 하려면 어떻게 해야 하나요?': `좋은 질문 3가지 비법이에요! ✨

1. **구체적으로** — ❌ "건강 알려줘" → ⭕ "70대에게 좋은 하루 30분 운동 알려줘"
2. **상황을 함께** — "스마트폰이 느려졌어. 사진이 많아서 그래. 어떻게 정리해?"처럼 배경을 말하세요
3. **이어서 묻기** — 답이 어려우면 "초등학생도 알도록 쉽게 설명해줘"라고 하세요

연습해 보세요 → 아래 입력창에 여러분만의 질문을 직접 써보세요!`,
    '건강 정보를 AI에게 물어봐도 되나요?': `네, 참고용으로는 좋아요! 다만 꼭 기억하세요 💪

**AI에게 물어보면 좋은 것:**
• 일반적인 건강 상식 (예: "걷기 운동의 효과가 뭐야?")
• 병원 가기 전 궁금한 점 정리
• 약 복용 시간표 만들기

**주의할 점:**
• AI 답변은 의사의 진단이 아니에요
• 몸이 아프면 꼭 병원·약국에 먼저 가세요!`,
  },
  default: `좋은 질문이에요! 😊

[시뮬레이션 모드] 현재 미리 준비된 답변을 보여드리고 있습니다.

실제 AI 모드에서는 여러분의 질문에 AI가 직접 답변을 만듭니다. 예시 질문 버튼을 눌러 다양한 답변을 확인해 보세요!

💡 **따라해 보세요:** 질문을 짧고 구체적으로 쓰면 더 좋은 답을 받을 수 있어요. 예) "스마트폰 글자 크게 하는 법 알려줘"`,
};

const DIFFICULTY_LABELS: Record<string, string> = {  easy: '초급',
  medium: '중급',
  hard: '고급',
};

const DIFFICULTY_COLORS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  easy: 'secondary',
  medium: 'default',
  hard: 'destructive',
};

const TAB_CONFIG: { key: MockTab; label: string; icon: React.ReactNode }[] = [
  { key: 'chat', label: 'AI 대화', icon: <MessageSquare className="w-4 h-4" /> },
  { key: 'image', label: '이미지 변환', icon: <ImageIcon className="w-4 h-4" /> },
  { key: 'future', label: '미래의 나', icon: <Sparkles className="w-4 h-4" /> },
  { key: 'quiz', label: 'AI 퀴즈', icon: <GraduationCap className="w-4 h-4" /> },
  { key: 'practice', label: '질문 체험', icon: <Lightbulb className="w-4 h-4" /> },
  { key: 'period', label: '체험 기간', icon: <CalendarClock className="w-4 h-4" /> },
];

const IMAGE_STYLE_IDS = IMAGE_STYLES.map((s) => s.id);
const FUTURE_AGE_IDS = AGE_OPTIONS.map((o) => String(o.age));

const emptyResults = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, '']));

const CHAT_CATEGORY_LABELS: Record<string, string> = {
  greeting: '인사말',
  ai_question: 'AI 질문',
  health: '건강',
  smartphone: '스마트폰',
  default: '기본',
};

// 체험 결과 이미지 1행 (미리보기 + 파일 업로드 + URL 입력 + 해제)
function ResultImageRow({
  label,
  sub,
  value,
  uploading,
  onUpload,
  onChange,
  onClear,
}: {
  label: string;
  sub: string;
  value: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onChange: (url: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 border rounded-lg p-3">
      <div className="flex items-center gap-3 sm:w-48 shrink-0">
        {value ? (
          <ResponsiveImage src={value} alt={label} variant="thumb" />
        ) : (
          <div className="senior-img-frame senior-img-thumb flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
          <Badge variant={value ? 'default' : 'outline'} className="text-[10px] mt-1">
            {value ? '등록됨' : '미설정'}
          </Badge>
        </div>
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="이미지 URL (/uploads/... 또는 https://...)"
          className="text-xs"
        />
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border cursor-pointer hover:bg-muted">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            파일 업로드
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = '';
              }}
            />
          </label>
          {value && (
            <Button variant="ghost" size="sm" onClick={onClear} className="text-xs text-destructive hover:text-destructive">
              <X className="w-3.5 h-3.5 mr-1" />
              해제
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 메인 컴포넌트
// ============================================

export default function MockDataManager() {
  const { authenticatedFetch } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<MockTab>('chat');
  const [mockData, setMockData] = useState<MockData>({
    chat: DEFAULT_CHAT,
    image: { ...DEFAULT_IMAGE, results: emptyResults(IMAGE_STYLE_IDS) },
    future: { ...DEFAULT_FUTURE, results: emptyResults(FUTURE_AGE_IDS) },
    quiz: DEFAULT_QUIZ,
    practice: DEFAULT_PRACTICE,
    schedule: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 목업 데이터 로드
  const loadMockData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await authenticatedFetch('/api/admin/mock');
      if (res.ok) {
        const data = await res.json();
        if (data.mockData) {
          const md = data.mockData;
          setMockData({
            chat: { ...DEFAULT_CHAT, ...(md.chat || {}) },
            image: {
              message: md.image?.message ?? DEFAULT_IMAGE.message,
              results: { ...emptyResults(IMAGE_STYLE_IDS), ...(md.image?.results || {}) },
            },
            future: {
              message: md.future?.message ?? DEFAULT_FUTURE.message,
              healthTips: Array.isArray(md.future?.healthTips) ? md.future.healthTips : DEFAULT_FUTURE.healthTips,
              results: { ...emptyResults(FUTURE_AGE_IDS), ...(md.future?.results || {}) },
            },
            quiz: {
              easy: Array.isArray(md.quiz?.easy) ? md.quiz.easy : DEFAULT_QUIZ.easy,
              medium: Array.isArray(md.quiz?.medium) ? md.quiz.medium : DEFAULT_QUIZ.medium,
              hard: Array.isArray(md.quiz?.hard) ? md.quiz.hard : DEFAULT_QUIZ.hard,
            },
            practice: {
              examples: Array.isArray(md.practice?.examples) && md.practice.examples.length > 0
                ? md.practice.examples
                : DEFAULT_PRACTICE.examples,
              answers: md.practice?.answers && typeof md.practice.answers === 'object'
                ? md.practice.answers
                : DEFAULT_PRACTICE.answers,
              default: typeof md.practice?.default === 'string' && md.practice.default
                ? md.practice.default
                : DEFAULT_PRACTICE.default,
            },
            schedule: md.schedule ?? null,
          });
          setHasChanges(false);
        }
      }
    } catch {
      toast.error('목업 데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  // 저장
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await authenticatedFetch('/api/admin/mock', {
        method: 'POST',
        body: JSON.stringify({ mockData }),
      });
      if (res.ok) {
        toast.success('목업 데이터가 저장되었습니다.');
        setHasChanges(false);
        // 프론트엔드에 즉시 반영
        refreshCmsContent();
      } else {
        const data = await res.json();
        toast.error(data.error || '저장에 실패했습니다.');
      }
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 기본값으로 초기화
  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await authenticatedFetch('/api/admin/mock/reset', {
        method: 'POST',
      });
      if (res.ok) {
        setMockData({
          chat: DEFAULT_CHAT,
          image: { ...DEFAULT_IMAGE, results: emptyResults(IMAGE_STYLE_IDS) },
          future: { ...DEFAULT_FUTURE, results: emptyResults(FUTURE_AGE_IDS) },
          quiz: DEFAULT_QUIZ,
          practice: DEFAULT_PRACTICE,
          schedule: null,
        });
        setHasChanges(false);
        toast.success('기본값으로 초기화되었습니다.');
        // 프론트엔드에 즉시 반영
        refreshCmsContent();
      } else {
        const data = await res.json();
        toast.error(data.error || '초기화에 실패했습니다.');
      }
    } catch {
      toast.error('초기화 중 오류가 발생했습니다.');
    } finally {
      setIsResetting(false);
    }
  };

  // 채팅 응답 업데이트
  const updateChatResponse = (key: keyof ChatResponses, value: string) => {
    setMockData((prev) => ({
      ...prev,
      chat: { ...prev.chat, [key]: value },
    }));
    setHasChanges(true);
  };

  // 이미지 메시지 업데이트
  const updateImageMessage = (value: string) => {
    setMockData((prev) => ({
      ...prev,
      image: { ...prev.image, message: value },
    }));
    setHasChanges(true);
  };

  // 미래의 나 메시지 업데이트
  const updateFutureMessage = (value: string) => {
    setMockData((prev) => ({
      ...prev,
      future: { ...prev.future, message: value },
    }));
    setHasChanges(true);
  };

  // 건강 팁 업데이트
  const updateHealthTip = (index: number, value: string) => {
    setMockData((prev) => {
      const tips = [...prev.future.healthTips];
      tips[index] = value;
      return { ...prev, future: { ...prev.future, healthTips: tips } };
    });
    setHasChanges(true);
  };

  // 건강 팁 추가/삭제
  const addHealthTip = () => {
    setMockData((prev) => ({
      ...prev,
      future: { ...prev.future, healthTips: [...prev.future.healthTips, ''] },
    }));
    setHasChanges(true);
  };

  // 체험 결과 이미지 URL 업데이트 (image/future 공용)
  const updateImageResult = (style: string, value: string) => {
    setMockData((prev) => ({
      ...prev,
      image: { ...prev.image, results: { ...prev.image.results, [style]: value } },
    }));
    setHasChanges(true);
  };

  const updateFutureResult = (age: string, value: string) => {
    setMockData((prev) => ({
      ...prev,
      future: { ...prev.future, results: { ...prev.future.results, [age]: value } },
    }));
    setHasChanges(true);
  };

  // 체험 결과 이미지 파일 업로드 → URL을 해당 칸에 반영
  const uploadResultImage = async (file: File, apply: (url: string) => void) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('JPG, PNG, WebP 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하여야 합니다.');
      return;
    }
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await authenticatedFetch('/api/admin/uploads', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        apply(data.url);
        toast.success('이미지가 업로드되었습니다. 저장 버튼을 눌러 반영하세요.');
      } else {
        toast.error(data.error || '업로드에 실패했습니다.');
      }
    } catch {
      toast.error('업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  // 체험 기간 업데이트
  const updateSchedule = (patch: Partial<MockSchedule>) => {
    setMockData((prev) => ({
      ...prev,
      schedule: { startAt: null, endAt: null, note: '', ...(prev.schedule || {}), ...patch },
    }));
    setHasChanges(true);
  };

  const clearSchedule = () => {
    setMockData((prev) => ({ ...prev, schedule: null }));
    setHasChanges(true);
  };

  const removeHealthTip = (index: number) => {
    setMockData((prev) => ({
      ...prev,
      future: {
        ...prev.future,
        healthTips: prev.future.healthTips.filter((_, i) => i !== index),
      },
    }));
    setHasChanges(true);
  };

  // 퀴즈 질문 업데이트
  const updateQuizQuestion = (difficulty: keyof QuizData, index: number, field: keyof QuizQuestion, value: string | number | string[]) => {
    setMockData((prev) => {
      const questions = [...prev.quiz[difficulty]];
      questions[index] = { ...questions[index], [field]: value };
      return { ...prev, quiz: { ...prev.quiz, [difficulty]: questions } };
    });
    setHasChanges(true);
  };

  // 퀴즈 질문 추가/삭제
  const addQuizQuestion = (difficulty: keyof QuizData) => {
    setMockData((prev) => {
      const questions = [...prev.quiz[difficulty]];
      const newId = questions.length > 0 ? Math.max(...questions.map((q) => q.id)) + 1 : 1;
      questions.push({
        id: newId,
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
        difficulty,
        category: 'AI 기초',
      });
      return { ...prev, quiz: { ...prev.quiz, [difficulty]: questions } };
    });
    setHasChanges(true);
  };

  const removeQuizQuestion = (difficulty: keyof QuizData, index: number) => {
    setMockData((prev) => ({
      ...prev,
      quiz: {
        ...prev.quiz,
        [difficulty]: prev.quiz[difficulty].filter((_, i) => i !== index),
      },
    }));
    setHasChanges(true);
  };

  // 질문 체험(프랙티스) 업데이트
  const updatePracticeExample = (index: number, field: keyof PracticeExample, value: string) => {
    setMockData((prev) => {
      const examples = [...prev.practice.examples];
      examples[index] = { ...examples[index], [field]: value };
      return { ...prev, practice: { ...prev.practice, examples } };
    });
    setHasChanges(true);
  };

  const addPracticeExample = () => {
    setMockData((prev) => ({
      ...prev,
      practice: {
        ...prev.practice,
        examples: [...prev.practice.examples, { id: `ex-${Date.now()}`, question: '', hint: '' }],
      },
    }));
    setHasChanges(true);
  };

  const removePracticeExample = (index: number) => {
    setMockData((prev) => ({
      ...prev,
      practice: {
        ...prev.practice,
        examples: prev.practice.examples.filter((_, i) => i !== index),
      },
    }));
    setHasChanges(true);
  };

  const updatePracticeAnswer = (question: string, value: string) => {
    setMockData((prev) => ({
      ...prev,
      practice: { ...prev.practice, answers: { ...prev.practice.answers, [question]: value } },
    }));
    setHasChanges(true);
  };

  const updatePracticeDefault = (value: string) => {
    setMockData((prev) => ({
      ...prev,
      practice: { ...prev.practice, default: value },
    }));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">목업 데이터를 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">목업 데이터 관리</h2>
          <Badge variant="outline" className="text-xs">
            시뮬레이션 모드
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              변경 사항 있음
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            기본값 복원
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            저장
          </Button>
        </div>
      </div>

      {/* 커스텀 탭 버튼 */}
      <div className="flex gap-2 border-b pb-0">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {/* AI 대화 탭 */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                사용자 질문 유형별 시뮬레이션 응답을 편집할 수 있습니다.
              </p>
              {(Object.keys(CHAT_CATEGORY_LABELS) as Array<keyof ChatResponses>).map((key) => (
                <Card key={key}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      {CHAT_CATEGORY_LABELS[key]}
                      <Badge variant="outline" className="text-[10px]">
                        {key}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={mockData.chat[key]}
                      onChange={(e) => updateChatResponse(key, e.target.value)}
                      rows={8}
                      className="font-mono text-sm resize-y"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 이미지 변환 탭 */}
          {activeTab === 'image' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                시뮬레이션 중 스타일별 결과 이미지를 미리 등록하면, 인터넷 없이도 체험 이미지가 표시됩니다.
                미등록 스타일은 사용자의 사진을 Canvas 효과로 변환해 보여줍니다.
              </p>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    스타일별 체험 결과 이미지
                    <Badge variant="secondary" className="text-xs">
                      {Object.values(mockData.image.results).filter(Boolean).length}/{IMAGE_STYLES.length} 등록
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    💡 오프라인 전시장용은 <strong>파일 업로드</strong>를 권장합니다 (서버에 저장되어 인터넷 없이 표시).
                    외부 URL은 온라인에서만 표시됩니다.
                  </p>
                  {IMAGE_STYLES.map((style) => (
                    <ResultImageRow
                      key={style.id}
                      label={`${style.emoji} ${style.label}`}
                      sub={`mock.image.result.${style.id}`}
                      value={mockData.image.results[style.id] || ''}
                      uploading={isUploading}
                      onUpload={(f) => uploadResultImage(f, (url) => updateImageResult(style.id, url))}
                      onChange={(url) => updateImageResult(style.id, url)}
                      onClear={() => updateImageResult(style.id, '')}
                    />
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    시뮬레이션 메시지
                    <Badge variant="outline" className="text-[10px]">
                      mock.image.message
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={mockData.image.message}
                    onChange={(e) => updateImageMessage(e.target.value)}
                    rows={10}
                    className="font-mono text-sm resize-y"
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* 미래의 나 탭 */}
          {activeTab === 'future' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                나이별 결과 이미지를 미리 등록하면, 인터넷 없이도 미래 모습 체험을 시연할 수 있습니다.
                미등록 나이는 사용자의 사진을 Canvas 효과로 변환해 보여줍니다.
              </p>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    나이별 체험 결과 이미지
                    <Badge variant="secondary" className="text-xs">
                      {Object.values(mockData.future.results).filter(Boolean).length}/{AGE_OPTIONS.length} 등록
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    💡 오프라인 전시장용은 <strong>파일 업로드</strong>를 권장합니다 (서버에 저장되어 인터넷 없이 표시).
                  </p>
                  {AGE_OPTIONS.map((option) => (
                    <ResultImageRow
                      key={option.age}
                      label={`${option.emoji} ${option.label}`}
                      sub={`mock.future.result.${option.age}`}
                      value={mockData.future.results[String(option.age)] || ''}
                      uploading={isUploading}
                      onUpload={(f) => uploadResultImage(f, (url) => updateFutureResult(String(option.age), url))}
                      onChange={(url) => updateFutureResult(String(option.age), url)}
                      onClear={() => updateFutureResult(String(option.age), '')}
                    />
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    시뮬레이션 메시지
                    <Badge variant="outline" className="text-[10px]">
                      mock.future.message
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={mockData.future.message}
                    onChange={(e) => updateFutureMessage(e.target.value)}
                    rows={6}
                    className="font-mono text-sm resize-y"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      건강 팁
                      <Badge variant="secondary" className="text-xs">
                        {mockData.future.healthTips.length}개
                      </Badge>
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={addHealthTip}>
                      <Plus className="w-4 h-4" />
                      팁 추가
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockData.future.healthTips.map((tip, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Badge variant="outline" className="shrink-0 mt-2">
                        {index + 1}
                      </Badge>
                      <Input
                        value={tip}
                        onChange={(e) => updateHealthTip(index, e.target.value)}
                        className="flex-1"
                        placeholder="건강 팁을 입력하세요"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeHealthTip(index)}
                        className="shrink-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* AI 퀴즈 탭 */}
          {activeTab === 'quiz' && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                난이도별 퀴즈 문제를 편집할 수 있습니다.
              </p>

              {(['easy', 'medium', 'hard'] as Array<keyof QuizData>).map((difficulty) => (
                <Card key={difficulty}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        {DIFFICULTY_LABELS[difficulty]}
                        <Badge variant={DIFFICULTY_COLORS[difficulty]} className="text-xs">
                          {mockData.quiz[difficulty].length}문제
                        </Badge>
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addQuizQuestion(difficulty)}
                      >
                        <Plus className="w-4 h-4" />
                        문제 추가
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {mockData.quiz[difficulty].map((q, qIndex) => (
                      <div key={qIndex} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">문제 {qIndex + 1}</Badge>
                            <Badge variant="secondary" className="text-xs">
                              {q.category}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeQuizQuestion(difficulty, qIndex)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* 질문 */}
                        <div>
                          <Label className="text-xs text-muted-foreground">질문</Label>
                          <Input
                            value={q.question}
                            onChange={(e) => updateQuizQuestion(difficulty, qIndex, 'question', e.target.value)}
                            className="mt-1"
                            placeholder="질문을 입력하세요"
                          />
                        </div>

                        {/* 보기 */}
                        <div>
                          <Label className="text-xs text-muted-foreground">보기 (4개)</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                            {q.options.map((opt, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQuizQuestion(difficulty, qIndex, 'correctAnswer', optIndex)}
                                  className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-colors ${
                                    q.correctAnswer === optIndex
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-muted-foreground/30 text-muted-foreground hover:border-primary/50'
                                  }`}
                                >
                                  {q.correctAnswer === optIndex ? <Check className="w-3 h-3" /> : String.fromCharCode(65 + optIndex)}
                                </button>
                                <Input
                                  value={opt}
                                  onChange={(e) => {
                                    const newOptions = [...q.options];
                                    newOptions[optIndex] = e.target.value;
                                    updateQuizQuestion(difficulty, qIndex, 'options', newOptions);
                                  }}
                                  className="flex-1 text-sm"
                                  placeholder={`보기 ${String.fromCharCode(65 + optIndex)}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 카테고리 */}
                        <div>
                          <Label className="text-xs text-muted-foreground">카테고리</Label>
                          <Input
                            value={q.category}
                            onChange={(e) => updateQuizQuestion(difficulty, qIndex, 'category', e.target.value)}
                            className="mt-1"
                            placeholder="예: AI 기초"
                          />
                        </div>

                        {/* 해설 */}
                        <div>
                          <Label className="text-xs text-muted-foreground">해설</Label>
                          <Textarea
                            value={q.explanation}
                            onChange={(e) => updateQuizQuestion(difficulty, qIndex, 'explanation', e.target.value)}
                            className="mt-1 text-sm"
                            rows={2}
                            placeholder="해설을 입력하세요"
                          />
                        </div>

                        {qIndex < mockData.quiz[difficulty].length - 1 && (
                          <Separator />
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {/* 질문 체험 탭 */}
          {activeTab === 'practice' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                질문 체험 메뉴의 예시 질문 목록과 질문별 시뮬레이션 답변을 편집합니다.
                저장하면 시뮬레이션 모드의 프론트에 즉시 반영됩니다.
              </p>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      예시 질문 목록
                      <Badge variant="secondary" className="text-xs">
                        {mockData.practice.examples.length}개
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        mock.practice.examples
                      </Badge>
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={addPracticeExample}>
                      <Plus className="w-4 h-4" />
                      질문 추가
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockData.practice.examples.map((ex, index) => (
                    <div key={ex.id || index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">예시 {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePracticeExample(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">질문</Label>
                        <Input
                          value={ex.question}
                          onChange={(e) => updatePracticeExample(index, 'question', e.target.value)}
                          className="mt-1"
                          placeholder="예: AI란 무엇인가요?"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">힌트 (선택)</Label>
                        <Input
                          value={ex.hint || ''}
                          onChange={(e) => updatePracticeExample(index, 'hint', e.target.value)}
                          className="mt-1"
                          placeholder="예: 가장 기본적인 질문이에요"
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    질문별 시뮬레이션 답변
                    <Badge variant="outline" className="text-[10px]">
                      mock.practice.answers
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    💡 위 예시 질문 목록의 각 질문에 대한 답변입니다. 질문 문구를 기준으로 매칭되며,
                    목록에 없는 질문은 아래 기본 답변이 표시됩니다.
                  </p>
                  {mockData.practice.examples.map((ex, index) => (
                    <div key={ex.id || index} className="space-y-1">
                      <Label className="text-xs font-medium">
                        “{ex.question || `(예시 ${index + 1} — 질문을 먼저 입력하세요)`}”에 대한 답변
                      </Label>
                      <Textarea
                        value={ex.question ? (mockData.practice.answers[ex.question] || '') : ''}
                        onChange={(e) => ex.question && updatePracticeAnswer(ex.question, e.target.value)}
                        rows={6}
                        className="font-mono text-sm resize-y"
                        placeholder="이 질문을 눌렀을 때 보여줄 답변을 입력하세요"
                        disabled={!ex.question}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    기본 답변
                    <Badge variant="outline" className="text-[10px]">
                      mock.practice.default
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={mockData.practice.default}
                    onChange={(e) => updatePracticeDefault(e.target.value)}
                    rows={6}
                    className="font-mono text-sm resize-y"
                  />
                </CardContent>
              </Card>
            </div>
          )}
          {/* 체험 기간 탭 */}
          {activeTab === 'period' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                시뮬레이션 체험 기간을 정하면, 기간 내에만 목업 모드가 동작합니다.
                기간을 비워 두면 상시 동작합니다. 저장 후 프론트에 즉시 반영됩니다.
              </p>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-primary" />
                    체험 기간 설정
                    <Badge variant="outline" className="text-[10px]">
                      mock.schedule
                    </Badge>
                    {(() => {
                      const s = mockData.schedule;
                      if (!s || (!s.startAt && !s.endAt)) return <Badge variant="secondary">상시 운영</Badge>;
                      const now = Date.now();
                      const st = s.startAt ? new Date(s.startAt).getTime() : -Infinity;
                      const en = s.endAt ? new Date(s.endAt).getTime() : Infinity;
                      if (now < st) return <Badge variant="outline">예정</Badge>;
                      if (now > en) return <Badge variant="destructive">종료됨</Badge>;
                      return <Badge variant="default">진행 중</Badge>;
                    })()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>시작 일시 (비워 두면 제한 없음)</Label>
                      <Input
                        type="datetime-local"
                        value={mockData.schedule?.startAt ? mockData.schedule.startAt.slice(0, 16) : ''}
                        onChange={(e) => updateSchedule({ startAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>종료 일시 (비워 두면 제한 없음)</Label>
                      <Input
                        type="datetime-local"
                        value={mockData.schedule?.endAt ? mockData.schedule.endAt.slice(0, 16) : ''}
                        onChange={(e) => updateSchedule({ endAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>안내 문구 (시니어 화면에 표시, 선택)</Label>
                    <Input
                      value={mockData.schedule?.note || ''}
                      onChange={(e) => updateSchedule({ note: e.target.value })}
                      placeholder="예: 경로당 체험 주간 (10.1~10.7)"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearSchedule} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4 mr-1" />
                      기간 해제 (상시 운영)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
