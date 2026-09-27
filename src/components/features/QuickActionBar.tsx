'use client';

import { motion } from 'framer-motion';
import {
  MessageSquare,
  ImageIcon,
  Sparkles,
  GraduationCap,
  Volume2,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TabId } from '@/types';

interface QuickActionBarProps {
  onNavigate: (tab: TabId) => void;
  onToggleVoice: () => void;
  voiceEnabled: boolean;
}

const QUICK_ACTIONS: { id: TabId | 'voice'; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: 'chat', label: 'AI 대화', icon: MessageSquare, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
  { id: 'image', label: '이미지 변환', icon: ImageIcon, color: 'text-violet-600 bg-violet-50 hover:bg-violet-100' },
  { id: 'future', label: '미래의 나', icon: Sparkles, color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
  { id: 'quiz', label: 'AI 퀴즈', icon: GraduationCap, color: 'text-rose-600 bg-rose-50 hover:bg-rose-100' },
  { id: 'settings', label: '설정', icon: Settings, color: 'text-slate-600 bg-slate-50 hover:bg-slate-100' },
];

export default function QuickActionBar({ onNavigate, onToggleVoice, voiceEnabled }: QuickActionBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto border-b bg-card/80 backdrop-blur-sm">
      <span className="text-xs text-muted-foreground font-medium shrink-0 hidden sm:inline">
        빠른 실행:
      </span>
      <div className="flex items-center gap-1.5">
        {QUICK_ACTIONS.map((action, i) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate(action.id as TabId)}
              className={`h-9 px-3 text-xs font-medium rounded-lg ${action.color} border border-transparent hover:border-current/20 shrink-0`}
            >
              <action.icon className="w-4 h-4 mr-1.5" />
              {action.label}
            </Button>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: QUICK_ACTIONS.length * 0.05 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVoice}
            className={`h-9 px-3 text-xs font-medium rounded-lg shrink-0 ${
              voiceEnabled
                ? 'text-primary bg-primary/10 hover:bg-primary/20'
                : 'text-muted-foreground bg-muted hover:bg-muted/80'
            }`}
          >
            <Volume2 className="w-4 h-4 mr-1.5" />
            {voiceEnabled ? '음성 켜짐' : '음성 끄기'}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
