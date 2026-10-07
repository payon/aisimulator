'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, TriangleAlert } from 'lucide-react';
import { useCmsContent } from '@/hooks/use-cms-content';
import { useMockMode, formatMockSchedule } from '@/hooks/use-mock-mode';
import MockModeIndicator from '@/components/features/MockModeIndicator';

interface AppStep {
  title: string;
  body: string;
}

const DEFAULT_ANDROID_STEPS: AppStep[] = [
  { title: 'Play 스토어 열기', body: '스마트폰에서 "Play 스토어" 앱(▶ 삼각형 모양)을 찾아 터치하세요.' },
  { title: '앱 검색하기', body: '위쪽 검색창에 "ChatGPT" 또는 "Gemini"라고 쓰고 검색(🔍)을 누르세요.' },
  { title: '제작사 확인하기', body: 'ChatGPT는 "OpenAI", Gemini는 "Google LLC"가 만든 것이 맞는지 확인하세요. 비슷한 이름의 가짜 앱이 있습니다.' },
  { title: '설치 누르기', body: '[설치] 버튼을 누르면 자동으로 내려받아집니다. 와이파이에서 하면 데이터가 절약됩니다.' },
  { title: '열기로 시작하기', body: '설치가 끝나면 [열기]를 누르세요. 바탕화면에도 아이콘이 생깁니다.' },
  { title: '가입하기', body: '구글 계정이나 이메일로 가입하세요. "Google로 계속하기"가 가장 편합니다.' },
];

const DEFAULT_IPHONE_STEPS: AppStep[] = [
  { title: 'App Store 열기', body: '스마트폰에서 "App Store" 앱(🅰️ 파란색 모양)을 찾아 터치하세요.' },
  { title: '앱 검색하기', body: '아래쪽 [검색]을 누르고 "ChatGPT"라고 쓰고 검색을 누르세요.' },
  { title: '제작사 확인하기', body: 'ChatGPT는 "OpenAI"가 만든 것이 맞는지 확인하세요.' },
  { title: '받기 누르기', body: '[받기]를 누르고 얼굴 인식이나 비밀번호로 확인하세요.' },
  { title: '열기로 시작하기', body: '설치가 끝나면 [열기]를 누르세요. 홈 화면에도 아이콘이 생깁니다.' },
  { title: '가입하기', body: '애플 계정이나 이메일로 가입하세요. "Apple로 계속하기"가 가장 편합니다.' },
];

const DEFAULT_TIPS: string[] = [
  '앱은 꼭 공식 스토어(Play 스토어·App Store)에서만 설치하세요',
  '설치가 안 되면 와이파이에 연결되어 있는지 확인하세요',
  '글자가 작으면 설정 → 디스플레이 → 글자 크기에서 크게 하세요',
  '기본 이용법: 앱을 열고 아래 입력창에 질문을 쓰고 보내기(➤)를 누르세요',
];

function parseSteps(raw: string, fallback: AppStep[]): AppStep[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback;
    return parsed.filter((s) => s && typeof s.title === 'string' && typeof s.body === 'string');
  } catch {
    return fallback;
  }
}

function parseTips(raw: string): string[] {
  if (!raw) return DEFAULT_TIPS;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TIPS;
  } catch {
    return DEFAULT_TIPS;
  }
}

function StepList({ steps, accent }: { steps: AppStep[]; accent: string }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span
            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${accent}`}
          >
            {i + 1}
          </span>
          <div>
            <p className="font-semibold text-sm sm:text-base">{step.title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function GuideAppPanel() {
  const { getContent } = useCmsContent();
  const { mockMode, mockSchedule } = useMockMode();

  const androidSteps = parseSteps(getContent('guide.app.androidSteps', ''), DEFAULT_ANDROID_STEPS);
  const iphoneSteps = parseSteps(getContent('guide.app.iphoneSteps', ''), DEFAULT_IPHONE_STEPS);
  const tips = parseTips(getContent('guide.app.tips', ''));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b bg-card">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <Smartphone className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-semibold text-sm">{getContent('guide.app.title', '스마트폰 앱 설치 안내')}</h2>
          <p className="text-xs text-muted-foreground">
            {getContent('guide.app.subtitle', 'AI 앱 설치부터 기본 사용까지')}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {mockMode && (
            <MockModeIndicator feature="appguide" scheduleText={formatMockSchedule(mockSchedule)} />
          )}

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-base sm:text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap py-2"
          >
            {getContent(
              'guide.app.intro',
              '내 스마트폰에 맞는 방법을 골라 천천히 따라해 보세요.\n급할 것 없어요, 하나씩 하면 됩니다! 😊',
            )}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🤖</span>
                  <h3 className="font-bold text-base sm:text-lg">
                    {getContent('guide.app.androidTitle', '안드로이드폰 (삼성·LG 등) 설치 방법')}
                  </h3>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {androidSteps.length}단계
                  </Badge>
                </div>
                <StepList steps={androidSteps} accent="bg-emerald-500" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🍎</span>
                  <h3 className="font-bold text-base sm:text-lg">
                    {getContent('guide.app.iphoneTitle', '아이폰 설치 방법')}
                  </h3>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {iphoneSteps.length}단계
                  </Badge>
                </div>
                <StepList steps={iphoneSteps} accent="bg-slate-500" />
              </CardContent>
            </Card>
          </motion.div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-5 sm:p-6">
              <h4 className="font-semibold text-sm mb-2">✅ 설치 후 기본 이용법</h4>
              <ul className="space-y-1.5">
                {tips.map((tip, i) => (
                  <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                    • {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-5 sm:p-6">
              <div className="flex gap-3">
                <TriangleAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {getContent(
                    'guide.app.warning',
                    '문자나 카톡으로 온 링크로는 앱을 설치하지 마세요. 꼭 Play 스토어·App Store 앱 안에서 직접 검색해서 설치하세요. 결제를 요구하면 일단 멈추고 가족에게 물어보세요.',
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
