'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  MessageSquare,
  Volume2,
  Type,
  ChevronRight,
  ChevronLeft,
  Hand,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const ONBOARDING_STEPS = [
  {
    icon: Sparkles,
    title: 'AI 플랫폼에 오신 것을 환영합니다! 👋',
    description: '이 플랫폼은 AI와 대화하고, 이미지를 변환하고, 퀴즈를 풀 수 있는 곳입니다.\n\n잠시 후 사용법을 간단히 알려드릴게요.',
    color: 'text-primary',
  },
  {
    icon: MessageSquare,
    title: 'AI와 대화해보세요 💬',
    description: '채팅 탭에서 AI에게 궁금한 것을 물어보세요.\n\n예: "오늘 날씨 어떄?" "건강하게 사는 법 알려줘"',
    color: 'text-emerald-600',
  },
  {
    icon: Volume2,
    title: '음성으로 들을 수 있어요 🔊',
    description: 'AI의 답변을 소리로 들을 수 있습니다.\n\n설정에서 음성 읽기 속도도 조절할 수 있어요.',
    color: 'text-amber-600',
  },
  {
    icon: Type,
    title: '글자 크기를 키울 수 있어요 📝',
    description: '상단의 ♿ 아이콘을 누르면\n글자 크기, 고대비, 음성 등을 설정할 수 있습니다.',
    color: 'text-violet-600',
  },
  {
    icon: Hand,
    title: '버튼이 커서 터치가 쉬워요 👆',
    description: '모든 버튼과 메뉴가 크게 만들어져 있어서\n손가락으로 쉽게 누를 수 있습니다.',
    color: 'text-rose-600',
  },
];

const STORAGE_KEY = 'senior-onboarding-completed';

export default function SeniorOnboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        // Show after a small delay so the page loads first
        const timer = setTimeout(() => setShow(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleClose = (completed: boolean) => {
    setShow(false);
    if (completed) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  };

  const nextStep = () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep((prev) => prev + 1);
    } else {
      handleClose(true);
    }
  };

  const prevStep = () => {
    if (step > 0) setStep((prev) => prev - 1);
  };

  if (!show) return null;

  const currentStep = ONBOARDING_STEPS[step];
  const Icon = currentStep.icon;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose(false);
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-full max-w-md"
          >
            <Card className="shadow-xl border-2">
              <CardContent className="p-6 sm:p-8">
                {/* Progress */}
                <div className="mb-6">
                  <Progress value={((step + 1) / ONBOARDING_STEPS.length) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {step + 1} / {ONBOARDING_STEPS.length}
                  </p>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.3 }}
                    className="text-center space-y-4"
                  >
                    <motion.div
                      className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-muted ${currentStep.color}`}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Icon className="w-8 h-8" />
                    </motion.div>

                    <h3 className="text-xl font-bold leading-tight">
                      {currentStep.title}
                    </h3>

                    <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                      {currentStep.description}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Actions */}
                <div className="flex items-center justify-between mt-8">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClose(false)}
                      className="text-muted-foreground"
                    >
                      나중에
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClose(true)}
                      className="text-muted-foreground"
                    >
                      건너뛰기
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    {step > 0 && (
                      <Button variant="outline" size="sm" onClick={prevStep}>
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        이전
                      </Button>
                    )}
                    <Button size="sm" onClick={nextStep}>
                      {step === ONBOARDING_STEPS.length - 1 ? (
                        '시작하기'
                      ) : (
                        <>
                          다음
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
