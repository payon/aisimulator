'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  MessagesSquare,
  ImageIcon,
  Sparkles,
  GraduationCap,
  Settings,
  Zap,
  ArrowRight,
  Volume2,
  BookOpen,
  Bot,
  Smartphone,
} from 'lucide-react';
import type { TabId } from '@/types';
import { useCmsContent } from '@/hooks/use-cms-content';
import { useNavItems } from '@/hooks/use-nav-items';
import { useSettingsStore } from '@/stores/index';

interface HomePageProps {
  onNavigate: (tab: TabId) => void;
}

const FALLBACK_TITLES: Record<TabId, string> = {
  home: '홈',
  chat: 'AI 대화하기',
  guide: 'AI 기초 안내',
  services: 'AI 서비스 소개',
  appguide: '앱 설치 안내',
  practice: '예시 질문 체험',
  image: '이미지 변환',
  future: '미래의 나',
  quiz: 'AI 퀴즈',
  settings: '설정',
};

const FALLBACK_DESCS: Record<TabId, string> = {
  home: 'AI 플랫폼 메인 화면',
  chat: 'AI와 자연스럽게 대화하며 궁금한 것을 물어보세요',
  guide: '생성형 AI가 무엇인지, 어떻게 활용하는지 배워보세요',
  services: 'ChatGPT·Gemini 등 대표 AI 서비스를 비교해 보세요',
  appguide: '스마트폰에 AI 앱을 설치하고 기본 사용법을 익혀보세요',
  practice: '예시 질문을 눌러 AI 답변 과정을 직접 체험해 보세요',
  image: '내 사진을 수채화, 만화, 애니메이션 등으로 변환',
  future: 'AI로 미래의 내 모습을 생성하고 건강 팁을 받아보세요',
  quiz: '초급/중급/고급 난이도로 AI 지식을 테스트하세요',
  settings: 'OpenAI, Gemini, Grok, Claude API 키를 설정하세요',
};

const featureDefs = [
  {
    id: 'guide' as TabId,
    icon: BookOpen,
    gradient: 'from-sky-500 to-blue-500',
    bgGradient: 'from-sky-50 to-blue-50',
    iconColor: 'text-sky-600',
    borderHover: 'hover:border-sky-300',
  },
  {
    id: 'services' as TabId,
    icon: Bot,
    gradient: 'from-cyan-500 to-sky-500',
    bgGradient: 'from-cyan-50 to-sky-50',
    iconColor: 'text-cyan-600',
    borderHover: 'hover:border-cyan-300',
  },
  {
    id: 'appguide' as TabId,
    icon: Smartphone,
    gradient: 'from-indigo-500 to-blue-500',
    bgGradient: 'from-indigo-50 to-blue-50',
    iconColor: 'text-indigo-600',
    borderHover: 'hover:border-indigo-300',
  },
  {
    id: 'practice' as TabId,
    icon: MessagesSquare,
    gradient: 'from-teal-500 to-emerald-500',
    bgGradient: 'from-teal-50 to-emerald-50',
    iconColor: 'text-teal-600',
    borderHover: 'hover:border-teal-300',
  },
  {
    id: 'chat' as TabId,
    icon: MessageSquare,
    gradient: 'from-emerald-500 to-teal-500',
    bgGradient: 'from-emerald-50 to-teal-50',
    iconColor: 'text-emerald-600',
    borderHover: 'hover:border-emerald-300',
  },
  {
    id: 'image' as TabId,
    icon: ImageIcon,
    gradient: 'from-violet-500 to-purple-500',
    bgGradient: 'from-violet-50 to-purple-50',
    iconColor: 'text-violet-600',
    borderHover: 'hover:border-violet-300',
  },
  {
    id: 'future' as TabId,
    icon: Sparkles,
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-50 to-orange-50',
    iconColor: 'text-amber-600',
    borderHover: 'hover:border-amber-300',
  },
  {
    id: 'quiz' as TabId,
    icon: GraduationCap,
    gradient: 'from-rose-500 to-pink-500',
    bgGradient: 'from-rose-50 to-pink-50',
    iconColor: 'text-rose-600',
    borderHover: 'hover:border-rose-300',
  },
  {
    id: 'settings' as TabId,
    icon: Settings,
    gradient: 'from-slate-500 to-gray-500',
    bgGradient: 'from-slate-50 to-gray-50',
    iconColor: 'text-slate-600',
    borderHover: 'hover:border-slate-300',
  },
];

export default function HomePage({ onNavigate }: HomePageProps) {
  const { getContent } = useCmsContent();
  const { voiceEnabled } = useSettingsStore();
  // 관리자 메뉴 관리 순서·표시 반영 (사이드바와 동일 순서)
  const navItems = useNavItems();
  const defById = new Map(featureDefs.map((def) => [def.id, def]));

  const features = navItems
    .filter(({ tab }) => defById.has(tab.id))
    .map(({ tab }) => {
      const def = defById.get(tab.id)!;
      return {
        ...def,
        title: getContent(`nav.${tab.id}.label`, getContent(`home.feature.${tab.id}.title`, FALLBACK_TITLES[tab.id])),
        description: getContent(`home.feature.${tab.id}.description`, FALLBACK_DESCS[tab.id]),
      };
    });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 히어로 섹션 - 시니어 친화적 큰 텍스트 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-primary/3 to-transparent border-b">
        <div className="max-w-3xl mx-auto px-6 pt-10 pb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-5">
              <Zap className="w-4 h-4" />
              {getContent('home.hero.badge', '다중 AI 제공자 지원')}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              {getContent('home.hero.title', 'AI 플랫폼')}
            </h1>
            <p className="text-muted-foreground mt-4 text-base sm:text-lg leading-relaxed whitespace-pre-wrap max-w-xl mx-auto">
              {getContent('home.hero.description', 'AI와 대화하고, 이미지를 변환하고, 미래를 예측하세요.\nOpenAI, Gemini, Grok, Claude — 원하는 AI를 선택하세요!')}
            </p>

            {/* 음성 안내 */}
            {voiceEnabled && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 inline-flex items-center gap-2 text-sm text-primary/80"
              >
                <Volume2 className="w-4 h-4" />
                AI 답변이 음성으로 재생됩니다
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* 기능 카드 그리드 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mt-6 mb-4">
            <h2 className="text-lg font-semibold">기능 선택</h2>
            <Badge variant="outline" className="text-xs">{features.length}개 기능</Badge>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
              >
                <Card
                  className={`cursor-pointer hover:shadow-lg active:shadow-md transition-all duration-200 group h-full border-2 border-transparent ${feature.borderHover}`}
                  onClick={() => onNavigate(feature.id)}
                >
                  <CardContent className={`p-5 sm:p-6 bg-gradient-to-br ${feature.bgGradient} rounded-xl h-full flex flex-col`}>
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center bg-white/80 shadow-sm ${feature.iconColor}`}>
                        <feature.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    <div className="mt-4 flex-1">
                      <h3 className="font-bold text-base sm:text-lg">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${feature.gradient}`} />
                      <span className="text-xs text-muted-foreground">클릭하여 시작</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* 안내 카드 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-5 sm:p-6">
                <div className="flex gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-xl">💡</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">시작하기 전에</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {getContent('home.info.text', '설정 페이지에서 원하는 AI 제공자의 API 키를 입력하면 바로 사용할 수 있습니다.\nAPI 키가 없어도 내장 AI를 사용할 수 있어요!')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 시니어 팁 카드 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-4"
          >
            <Card className="bg-amber-50/50 border-amber-200/50">
              <CardContent className="p-5 sm:p-6">
                <div className="flex gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Volume2 className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-amber-800">시니어 이용 팁</h4>
                    <p className="text-sm text-amber-700/80 leading-relaxed">
                      상단의 ♿ 아이콘으로 글자 크기와 음성 속도를 조절할 수 있습니다.
                      AI 답변을 소리로 듣고 싶으면 음성 버튼(🔊)을 누르세요.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
