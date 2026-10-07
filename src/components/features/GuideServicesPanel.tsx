'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, ExternalLink } from 'lucide-react';
import { useCmsContent } from '@/hooks/use-cms-content';
import { useMockMode, formatMockSchedule } from '@/hooks/use-mock-mode';
import MockModeIndicator from '@/components/features/MockModeIndicator';

interface AiService {
  id: string;
  name: string;
  company: string;
  desc: string;
  features: string[];
  link?: string;
  emoji?: string;
}

const DEFAULT_SERVICES: AiService[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    company: 'OpenAI',
    desc: '가장 많이 쓰이는 대화형 AI입니다. 질문에 답하고, 글을 쓰고, 번역을 합니다.',
    features: ['대화·질문 답변', '글쓰기·요약', '사진 설명·번역'],
    link: 'https://chat.openai.com',
    emoji: '💬',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    company: 'Google',
    desc: '구글이 만든 AI로, 안드로이드 스마트폰에 기본으로 들어 있는 경우가 많습니다.',
    features: ['구글 검색과 연결', '음성 질문', '사진·문서 이해'],
    link: 'https://gemini.google.com',
    emoji: '✨',
  },
  {
    id: 'claude',
    name: 'Claude',
    company: 'Anthropic',
    desc: '긴 글을 읽고 요약하는 데 강점이 있는 AI입니다. 설명이 친절합니다.',
    features: ['긴 글 요약', '친절한 설명', '문서 작성 도움'],
    link: 'https://claude.ai',
    emoji: '📝',
  },
  {
    id: 'wrtn',
    name: '뤼튼',
    company: 'Wrtn',
    desc: '한국에서 만든 AI 서비스로, 한국어가 편하고 가입이 쉽습니다.',
    features: ['한국어에 강함', '캐릭터 대화', '무료로 시작'],
    link: 'https://wrtn.ai',
    emoji: '🇰🇷',
  },
];

function parseServices(raw: string): AiService[] {
  if (!raw) return DEFAULT_SERVICES;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_SERVICES;
    return parsed.filter(
      (s) => s && typeof s.name === 'string' && typeof s.desc === 'string',
    );
  } catch {
    return DEFAULT_SERVICES;
  }
}

export default function GuideServicesPanel() {
  const { getContent } = useCmsContent();
  const { mockMode, mockSchedule } = useMockMode();

  const services = parseServices(getContent('guide.services.list', ''));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b bg-card">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-semibold text-sm">{getContent('guide.services.title', '대표 생성형 AI 서비스')}</h2>
          <p className="text-xs text-muted-foreground">
            {getContent('guide.services.subtitle', 'ChatGPT·Gemini 등 어떤 서비스가 있나요?')}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {mockMode && (
            <MockModeIndicator feature="services" scheduleText={formatMockSchedule(mockSchedule)} />
          )}

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-base sm:text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap py-2"
          >
            {getContent(
              'guide.services.intro',
              '모두 "질문하면 답해주는" 서비스입니다.\n마음에 드는 것 하나를 골라 시작해 보세요. 😊',
            )}
          </motion.p>

          {services.map((service, index) => (
            <motion.div
              key={service.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <Card>
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{service.emoji || '🤖'}</span>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg">{service.name}</h3>
                      <p className="text-xs text-muted-foreground">{service.company}</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {index + 1}/{services.length}
                    </Badge>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mt-3 whitespace-pre-wrap">
                    {service.desc}
                  </p>
                  {service.features && service.features.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {service.features.map((f, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {service.link && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => window.open(service.link, '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      {service.name} 바로가기
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-5 sm:p-6">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {getContent(
                  'guide.services.note',
                  '💡 고르는 팁: 안드로이드폰을 쓰시면 Gemini, 아이폰을 쓰시면 ChatGPT 앱부터 설치해 보세요. 다음 "앱 설치 안내" 메뉴에서 설치 방법을 알려드립니다.',
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
