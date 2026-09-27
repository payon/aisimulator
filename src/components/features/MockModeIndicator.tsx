'use client';

import { motion } from 'framer-motion';
import { FlaskConical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type FeatureType = 'chat' | 'image' | 'future' | 'quiz';

const FEATURE_DESCRIPTIONS: Record<FeatureType, string> = {
  chat: '미리 준비된 답변으로 AI 대화를 시연합니다. 실제 AI를 사용하려면 설정에서 시뮬레이션 모드를 끄세요.',
  image: '이미지 변환 과정을 시연합니다. 관리자가 등록한 체험 이미지가 표시될 수 있습니다.',
  future: '미래 모습 생성 과정을 시연합니다. 관리자가 등록한 체험 이미지와 건강 팁이 제공됩니다.',
  quiz: '미리 준비된 퀴즈 문제로 시연합니다. 난이도별 5문제가 제공됩니다.',
};

interface MockModeIndicatorProps {
  feature: FeatureType;
  className?: string;
  scheduleText?: string | null;
}

export default function MockModeIndicator({ feature, className, scheduleText }: MockModeIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 ${className || ''}`}
    >
      <FlaskConical className="w-4 h-4 shrink-0 text-amber-600" />
      <Badge
        variant="secondary"
        className="text-[10px] px-1.5 py-0 bg-amber-200 text-amber-800 border-0 shrink-0"
      >
        시뮬레이션 모드
      </Badge>
      <span className="text-xs leading-snug">
        {FEATURE_DESCRIPTIONS[feature]}
        {scheduleText && (
          <>
            <br />
            <span className="font-medium">📅 {scheduleText}</span>
          </>
        )}
      </span>
    </motion.div>
  );
}
