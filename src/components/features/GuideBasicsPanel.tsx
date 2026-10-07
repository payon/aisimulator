'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Lightbulb, TriangleAlert } from 'lucide-react';
import { useCmsContent } from '@/hooks/use-cms-content';
import { useMockMode, formatMockSchedule } from '@/hooks/use-mock-mode';
import MockModeIndicator from '@/components/features/MockModeIndicator';

interface GuideSection {
  title: string;
  body: string;
  emoji?: string;
}

const DEFAULT_SECTIONS: GuideSection[] = [
  {
    title: '생성형 AI란?',
    body: '생성형 AI는 질문을 하면 사람처럼 새로운 글, 그림, 음악을 만들어내는 기술입니다. 계산기처럼 정해진 답만 내는 것이 아니라, 배운 내용을 바탕으로 매번 새로운 답변을 만듭니다. ChatGPT, Gemini가 대표적입니다.',
    emoji: '🌱',
  },
  {
    title: '어떻게 동작하나요?',
    body: '아주 많은 글과 그림을 미리 공부해 두었다가, 질문이 오면 가장 어울리는 답을 조합해 냅니다. 요리사가 많은 레시피를 외워 두었다가 주문에 맞춰 요리하는 것과 비슷합니다.',
    emoji: '🍳',
  },
  {
    title: '무엇을 할 수 있나요?',
    body: '궁금한 질문에 답하기, 편지·문자 대신 써주기, 외국어 번역, 그림 그리기, 요리법 알려주기 등 다양합니다. 스마트폰에서 말로 질문해도 됩니다.',
    emoji: '✨',
  },
  {
    title: '잘 활용하는 방법',
    body: '짧고 구체적으로 질문할수록 좋은 답을 받습니다. 예) "건강 알려줘"보다는 "70대에게 좋은 하루 30분 운동 알려줘"가 좋습니다. 답이 어려우면 "쉽게 설명해줘"라고 이어서 물어보세요.',
    emoji: '💬',
  },
];

const DEFAULT_TIPS: string[] = [
  '처음에는 짧은 질문부터 시작하세요 (예: "오늘 날씨 어때?")',
  '개인정보(주민번호, 계좌번호)는 절대 입력하지 마세요',
  '중요한 결정(건강, 돈 문제)은 AI 답만 믿지 말고 전문가에게 확인하세요',
];

function parseJsonArray<T>(raw: string, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export default function GuideBasicsPanel() {
  const { getContent } = useCmsContent();
  const { mockMode, mockSchedule } = useMockMode();

  const sections = parseJsonArray<GuideSection>(
    getContent('guide.basics.sections', ''),
    DEFAULT_SECTIONS,
  );
  const tips = parseJsonArray<string>(getContent('guide.basics.tips', ''), DEFAULT_TIPS);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b bg-card">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-semibold text-sm">{getContent('guide.basics.title', '생성형 AI 기초 안내')}</h2>
          <p className="text-xs text-muted-foreground">
            {getContent('guide.basics.subtitle', '생성형 AI가 무엇인지 쉽게 알아보세요')}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {mockMode && (
            <MockModeIndicator feature="guide" scheduleText={formatMockSchedule(mockSchedule)} />
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-4"
          >
            <p className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {getContent(
                'guide.basics.intro',
                'AI가 글을 쓰고 그림을 그린다니, 어떻게 가능한 걸까요?\n아래 설명을 차근차근 읽어보세요. 😊',
              )}
            </p>
          </motion.div>

          {sections.map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <Card>
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-2">
                    {section.emoji && <span className="text-2xl">{section.emoji}</span>}
                    <h3 className="font-bold text-base sm:text-lg">{section.title}</h3>
                    <Badge variant="outline" className="text-[10px] ml-auto">
                      {index + 1}/{sections.length}
                    </Badge>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {section.body}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          <Card className="bg-amber-50/50 border-amber-200/50">
            <CardContent className="p-5 sm:p-6">
              <div className="flex gap-3">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-amber-800">기억할 점</h4>
                  <ul className="space-y-1.5">
                    {tips.map((tip, i) => (
                      <li key={i} className="text-sm text-amber-700/80 leading-relaxed">
                        • {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-5 sm:p-6">
              <div className="flex gap-3">
                <TriangleAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {getContent(
                    'guide.basics.warning',
                    'AI의 답변은 항상 맞는 것이 아닙니다. 특히 건강·돈과 관련된 내용은 꼭 가족이나 전문가와 상의하세요.',
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
