'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hand,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  PartyPopper,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSpeechSynthesis } from '@/hooks/use-voice';
import { useSettingsStore, useGuideTourStore } from '@/stores/index';
import { useIsMobile } from '@/hooks/use-mobile';
import { useClientValue } from '@/hooks/use-hydrated';

// === 가이드 스텝 정의 ===
export interface GuideStep {
  targetSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  /** true면 이 스텝에서 모바일 사이드바를 자동으로 열어야 함 */
  requiresSidebarOpen?: boolean;
}

// 데스크탑용 스텝 (9단계)
export const DESKTOP_GUIDE_STEPS: GuideStep[] = [
  {
    targetSelector: '[data-guide="voice-toggle"]',
    title: '음성 켜기/끄기',
    description: '이 버튼을 누르면 AI의 답변을 소리로 들을 수 있어요. 한 번 더 누르면 꺼져요.',
    position: 'bottom',
  },
  {
    targetSelector: '[data-guide="accessibility"]',
    title: '접근성 설정',
    description: '글자 크기, 음성 속도, 큰 터치 영역 등을 설정할 수 있어요. 눈이 편하시도록 조절해보세요.',
    position: 'bottom',
  },
  {
    targetSelector: '[data-guide="nav-home"]',
    title: '홈 화면',
    description: '언제든 이 버튼을 눌러 첫 화면으로 돌아올 수 있어요.',
    position: 'right',
  },
  {
    targetSelector: '[data-guide="nav-chat"]',
    title: 'AI 대화',
    description: 'AI와 대화하며 궁금한 것을 물어보세요. 음성으로도 질문할 수 있어요!',
    position: 'right',
  },
  {
    targetSelector: '[data-guide="nav-guide"]',
    title: 'AI 기초 안내',
    description: '생성형 AI가 무엇인지, 어떻게 활용하는지 쉽게 배워보세요.',
    position: 'right',
  },
  {
    targetSelector: '[data-guide="nav-services"]',
    title: 'AI 서비스 소개',
    description: 'ChatGPT, Gemini 같은 대표 AI 서비스를 비교해 보세요.',
    position: 'right',
  },
  {
    targetSelector: '[data-guide="nav-appguide"]',
    title: '앱 설치 안내',
    description: '스마트폰에 AI 앱을 설치하고 기본 사용법을 익혀보세요.',
    position: 'right',
  },
  {
    targetSelector: '[data-guide="nav-practice"]',
    title: '질문 체험',
    description: '예시 질문을 눌러 AI가 답하는 과정을 직접 체험해 보세요!',
    position: 'right',
  },
  {
    targetSelector: '[data-guide="nav-image"]',
    title: '이미지 변환',
    description: '내 사진을 수채화, 만화 등 다양한 스타일로 바꿀 수 있어요.',
    position: 'right',
  },
  {
    targetSelector: '[data-guide="nav-future"]',
    title: '미래의 나',
    description: 'AI로 미래의 내 모습을 만들어볼 수 있어요. 건강 팁도 받아보세요!',
    position: 'right',
  },
  {
    targetSelector: '[data-guide="nav-quiz"]',
    title: 'AI 퀴즈',
    description: 'AI에 대해 얼마나 알고 계신가요? 초급부터 고급까지 퀴즈를 풀어보세요!',
    position: 'right',
  },
  {
    targetSelector: '[data-guide="nav-settings"]',
    title: '설정',
    description: 'API 키를 입력하거나 시뮬레이션 모드를 켤 수 있어요.',
    position: 'right',
  },
];

// 모바일용 스텝 (10단계 — 사이드바 토글 스텝 추가, 네비게이션 위치 'bottom')
export const MOBILE_GUIDE_STEPS: GuideStep[] = [
  {
    targetSelector: '[data-guide="voice-toggle"]',
    title: '음성 켜기/끄기',
    description: '이 버튼을 누르면 AI의 답변을 소리로 들을 수 있어요. 한 번 더 누르면 꺼져요.',
    position: 'bottom',
  },
  {
    targetSelector: '[data-guide="accessibility"]',
    title: '접근성 설정',
    description: '글자 크기, 음성 속도, 큰 터치 영역 등을 설정할 수 있어요. 눈이 편하시도록 조절해보세요.',
    position: 'bottom',
  },
  {
    // ★ 모바일 전용: 메뉴 열기 버튼 안내
    targetSelector: '[data-guide="sidebar-toggle"]',
    title: '메뉴 열기',
    description: '이 버튼을 누르면 화면 왼쪽에서 메뉴가 열려요. 각 기능으로 이동할 수 있습니다.',
    position: 'bottom',
  },
  {
    targetSelector: '[data-guide="nav-home"]',
    title: '홈 화면',
    description: '언제든 이 버튼을 눌러 첫 화면으로 돌아올 수 있어요.',
    position: 'bottom',
    requiresSidebarOpen: true,
  },
  {
    targetSelector: '[data-guide="nav-chat"]',
    title: 'AI 대화',
    description: 'AI와 대화하며 궁금한 것을 물어보세요. 음성으로도 질문할 수 있어요!',
    position: 'bottom',
    requiresSidebarOpen: true,
  },
  {
    targetSelector: '[data-guide="nav-guide"]',
    title: 'AI 기초 안내',
    description: '생성형 AI가 무엇인지, 어떻게 활용하는지 쉽게 배워보세요.',
    position: 'bottom',
    requiresSidebarOpen: true,
  },
  {
    targetSelector: '[data-guide="nav-services"]',
    title: 'AI 서비스 소개',
    description: 'ChatGPT, Gemini 같은 대표 AI 서비스를 비교해 보세요.',
    position: 'bottom',
    requiresSidebarOpen: true,
  },
  {
    targetSelector: '[data-guide="nav-appguide"]',
    title: '앱 설치 안내',
    description: '스마트폰에 AI 앱을 설치하고 기본 사용법을 익혀보세요.',
    position: 'bottom',
    requiresSidebarOpen: true,
  },
  {
    targetSelector: '[data-guide="nav-practice"]',
    title: '질문 체험',
    description: '예시 질문을 눌러 AI가 답하는 과정을 직접 체험해 보세요!',
    position: 'bottom',
    requiresSidebarOpen: true,
  },
  {
    targetSelector: '[data-guide="nav-image"]',
    title: '이미지 변환',
    description: '내 사진을 수채화, 만화 등 다양한 스타일로 바꿀 수 있어요.',
    position: 'bottom',
    requiresSidebarOpen: true,
  },
  {
    targetSelector: '[data-guide="nav-future"]',
    title: '미래의 나',
    description: 'AI로 미래의 내 모습을 만들어볼 수 있어요. 건강 팁도 받아보세요!',
    position: 'bottom',
    requiresSidebarOpen: true,
  },
  {
    targetSelector: '[data-guide="nav-quiz"]',
    title: 'AI 퀴즈',
    description: 'AI에 대해 얼마나 알고 계신가요? 초급부터 고급까지 퀴즈를 풀어보세요!',
    position: 'bottom',
    requiresSidebarOpen: true,
  },
  {
    targetSelector: '[data-guide="nav-settings"]',
    title: '설정',
    description: 'API 키를 입력하거나 시뮬레이션 모드를 켤 수 있어요.',
    position: 'bottom',
    requiresSidebarOpen: true,
  },
];

// 하위 호환용 기존 export
export const GUIDE_STEPS = DESKTOP_GUIDE_STEPS;

// === 툴팁 위치 계산 ===
interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

function calculateTooltipPosition(
  targetRect: DOMRect,
  position: GuideStep['position'],
  tooltipWidth: number,
  tooltipHeight: number
): TooltipPosition {
  const gap = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const padding = 12;

  let top = 0;
  let left = 0;
  let arrowPosition = position;

  switch (position) {
    case 'bottom':
      top = targetRect.bottom + gap;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      break;
    case 'top':
      top = targetRect.top - tooltipHeight - gap;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      break;
    case 'right':
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.right + gap;
      break;
    case 'left':
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.left - tooltipWidth - gap;
      break;
  }

  // Clamp to viewport
  left = Math.max(padding, Math.min(left, vw - tooltipWidth - padding));
  top = Math.max(padding, Math.min(top, vh - tooltipHeight - padding));

  // Fallback: if tooltip would be off-screen, reposition
  if (position === 'bottom' && top + tooltipHeight > vh - padding) {
    top = targetRect.top - tooltipHeight - gap;
    arrowPosition = 'top';
  }
  if (position === 'top' && top < padding) {
    top = targetRect.bottom + gap;
    arrowPosition = 'bottom';
  }
  if (position === 'right' && left + tooltipWidth > vw - padding) {
    left = targetRect.left - tooltipWidth - gap;
    arrowPosition = 'left';
  }
  if (position === 'left' && left < padding) {
    left = targetRect.right + tooltipWidth + gap;
    arrowPosition = 'right';
  }

  return { top, left, arrowPosition };
}

// === 화살표 아이콘 선택 ===
function ArrowIcon({ direction, className }: { direction: GuideStep['position']; className?: string }) {
  switch (direction) {
    case 'top':
      return <ChevronUp className={className} />;
    case 'bottom':
      return <ChevronDown className={className} />;
    case 'left':
      return <ChevronLeft className={className} />;
    case 'right':
      return <ChevronRight className={className} />;
  }
}

// === 사이드바 제어 유틸리티 (useSidebar 컨텍스트 없이) ===
function openMobileSidebar() {
  // 사이드바 트리거 버튼을 프로그래매틱하게 클릭하여 Sheet 열기
  const trigger = document.querySelector('[data-guide="sidebar-toggle"]') as HTMLElement | null;
  if (trigger) {
    trigger.click();
    return true;
  }
  return false;
}

function closeMobileSidebar() {
  // Sheet의 오버레이를 클릭하여 닫기 (또는 ESC 키 시뮬레이션)
  const overlay = document.querySelector('[data-sidebar="sidebar"]')?.closest('[role="dialog"]')?.querySelector('[data-state="open"]') as HTMLElement | null;
  if (overlay) {
    // Radix Sheet는 오버레이 클릭으로 닫을 수 있음
    const closeBtn = overlay.closest('[role="dialog"]')?.querySelector('button') as HTMLElement | null;
    if (closeBtn) {
      closeBtn.click();
      return;
    }
  }
  // 대안: ESC 키 이벤트 발생
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

function isMobileSidebarOpen(): boolean {
  // 모바일 사이드바 Sheet가 열려있는지 확인
  const sheet = document.querySelector('[data-mobile="true"][data-state="open"]');
  return !!sheet;
}

// === 메인 컴포넌트 ===
export default function SeniorGuideTour() {
  const { active, currentStep, start, stop, nextStep, prevStep, complete, showWelcome, openWelcome, closeWelcome } = useGuideTourStore();
  const { voiceEnabled, readingSpeed } = useSettingsStore();
  const { speak, stop: stopTTS } = useSpeechSynthesis();

  // hydration-safe 모바일 감지: 서버는 항상 false, 클라이언트는 마운트 후 실제 값
  const rawIsMobile = useIsMobile();
  const isMobile = useClientValue(false, () => rawIsMobile);

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({ top: 0, left: 0, arrowPosition: 'bottom' });
  const [showComplete, setShowComplete] = useState(false);
  const [stepNotFound, setStepNotFound] = useState(false);
  const [tooltipSize, setTooltipSize] = useState({ width: 320, height: 200 });

  // 투어 중 사이드바를 자동으로 열었는지 추적 → 완료/스킵 시 원래대로 복원
  const sidebarAutoOpenedRef = useRef(false);

  const tooltipRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 자기 자신을 재시도할 때 사용하는 ref (circular dependency 해결)
  const syncGuidePositionRef = useRef<() => void>(() => {});

  // 현재 디바이스에 맞는 스텝 배열
  const steps = isMobile ? MOBILE_GUIDE_STEPS : DESKTOP_GUIDE_STEPS;

  // Start tour -> show welcome screen (헤더 도움말 버튼에서 호출)
  // Welcome -> begin actual tour
  const handleBeginTour = useCallback(() => {
    closeWelcome();
    start();
  }, [closeWelcome, start]);

  // Skip from welcome
  const handleSkipWelcome = useCallback(() => {
    closeWelcome();
    complete();
  }, [closeWelcome, complete]);

  // 모바일 사이드바 자동 열기 (필요한 스텝에서 호출)
  const ensureSidebarOpen = useCallback((): boolean => {
    if (isMobile && !isMobileSidebarOpen()) {
      const opened = openMobileSidebar();
      if (opened) {
        sidebarAutoOpenedRef.current = true;
      }
      return opened;
    }
    return true;
  }, [isMobile]);

  // 모바일 사이드바 자동 닫기 (투어 종료 시)
  const closeAutoOpenedSidebar = useCallback(() => {
    if (sidebarAutoOpenedRef.current && isMobile) {
      closeMobileSidebar();
      sidebarAutoOpenedRef.current = false;
    }
  }, [isMobile]);

  // Combined: find target, update rect, and calculate tooltip position
  const syncGuidePosition = useCallback(() => {
    if (!active || showWelcome || showComplete) return;

    const step = steps[currentStep];
    if (!step) {
      setShowComplete(true);
      return;
    }

    // 모바일에서 사이드바가 필요한 스텝인데 사이드바가 닫혀 있으면 열고 재시도
    if (step.requiresSidebarOpen && isMobile && !isMobileSidebarOpen()) {
      ensureSidebarOpen();
      // 사이드바 Sheet 애니메이션 완료 후 재시도 (350ms 대기)
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        syncGuidePositionRef.current();
      }, 350);
      return;
    }

    const el = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (!el) {
      // 모바일에서 사이드바 내부 요소를 못 찾으면 사이드바를 열고 재시도
      if (step.requiresSidebarOpen && isMobile) {
        ensureSidebarOpen();
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          syncGuidePositionRef.current();
        }, 350);
        return;
      }

      setStepNotFound(true);
      if (currentStep < steps.length - 1) {
        nextStep();
      } else {
        setShowComplete(true);
      }
      return;
    }

    setStepNotFound(false);
    const rect = el.getBoundingClientRect();
    setTargetRect(rect);

    // Scroll element into view if needed
    const isInViewport =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth;

    if (!isInViewport) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }

    // Calculate tooltip position after getting rect
    rafRef.current = requestAnimationFrame(() => {
      const finalRect = el.getBoundingClientRect();
      setTargetRect(finalRect);

      const tw = tooltipSize.width;
      const th = tooltipSize.height;
      const pos = calculateTooltipPosition(finalRect, step.position, tw, th);
      setTooltipPos(pos);
    });
  }, [active, currentStep, showWelcome, showComplete, nextStep, tooltipSize, steps, isMobile, ensureSidebarOpen]);

  // ref 업데이트 (setTimeout 재시도에서 사용)
  useEffect(() => {
    syncGuidePositionRef.current = syncGuidePosition;
  }, [syncGuidePosition]);

  // Measure tooltip size when step changes
  useEffect(() => {
    if (tooltipRef.current) {
      const { width, height } = tooltipRef.current.getBoundingClientRect();
      setTooltipSize({ width, height });
    }
  }, [active, currentStep, showWelcome, showComplete]);

  // Sync position on step change using rAF
  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => {
      syncGuidePosition();
    });
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [syncGuidePosition]);

  // Resize observer + window resize/scroll listener for target element
  useEffect(() => {
    if (!active || showWelcome || showComplete) return;

    const step = steps[currentStep];
    if (!step) return;

    const el = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (!el) return;

    resizeObserverRef.current = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      const tw = tooltipSize.width;
      const th = tooltipSize.height;
      const pos = calculateTooltipPosition(rect, step.position, tw, th);
      setTooltipPos(pos);
    });
    resizeObserverRef.current.observe(el);

    const handleResize = () => {
      requestAnimationFrame(() => syncGuidePosition());
    };
    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      const tw = tooltipSize.width;
      const th = tooltipSize.height;
      const pos = calculateTooltipPosition(rect, step.position, tw, th);
      setTooltipPos(pos);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      resizeObserverRef.current?.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [active, currentStep, showWelcome, showComplete, syncGuidePosition, tooltipSize, steps]);

  // TTS: read step description aloud when step changes
  useEffect(() => {
    if (!active || showWelcome || showComplete) return;
    if (!voiceEnabled) return;

    const step = steps[currentStep];
    if (!step) return;

    const timer = setTimeout(() => {
      speak(step.description, readingSpeed);
    }, 600);

    return () => {
      clearTimeout(timer);
      stopTTS();
    };
  }, [active, currentStep, voiceEnabled, showWelcome, showComplete, speak, stopTTS, readingSpeed, steps]);

  // Handle next step
  const handleNext = useCallback(() => {
    stopTTS();
    if (currentStep >= steps.length - 1) {
      setShowComplete(true);
    } else {
      nextStep();
    }
  }, [currentStep, nextStep, stopTTS, steps]);

  // Handle previous step
  const handlePrev = useCallback(() => {
    stopTTS();
    prevStep();
  }, [prevStep, stopTTS]);

  // Handle skip
  const handleSkip = useCallback(() => {
    stopTTS();
    stop();
    complete();
    closeAutoOpenedSidebar();
  }, [stop, complete, stopTTS, closeAutoOpenedSidebar]);

  // Handle complete
  const handleComplete = useCallback(() => {
    stopTTS();
    setShowComplete(false);
    complete();
    closeAutoOpenedSidebar();
  }, [complete, stopTTS, closeAutoOpenedSidebar]);

  // Current step data
  const step = steps[currentStep];
  const totalSteps = steps.length;

  return (
    <>
      <AnimatePresence>
        {/* ===== 환영 화면 ===== */}
        {showWelcome && (
          <motion.div
            key="guide-welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 text-center"
            >
              {/* Animated icon */}
              <motion.div
                className="w-20 h-20 rounded-full mx-auto mb-6 bg-primary/10 flex items-center justify-center"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              >
                <Hand className="w-10 h-10 text-primary" />
              </motion.div>

              <h2 className="text-2xl font-bold mb-3 text-foreground">
                AI 플랫폼 사용법 안내
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                각 버튼의 기능을 하나씩 알려드릴게요.<br />
                차근차근 따라오시면 됩니다!
              </p>

              {/* 모바일 안내 추가 */}
              {isMobile && (
                <div className="mb-6 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 justify-center mb-1">
                    <Menu className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">모바일 안내</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    메뉴 버튼 사용법도 함께 안내해 드려요.
                  </p>
                </div>
              )}

              {!isMobile && <div className="mb-6" />}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={handleBeginTour}
                  className="min-h-[48px] text-base font-semibold px-8"
                >
                  안내 시작
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleSkipWelcome}
                  className="min-h-[48px] text-base px-8"
                >
                  건너뛰기
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ===== 완료 화면 ===== */}
        {showComplete && (
          <motion.div
            key="guide-complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 text-center"
            >
              {/* Celebration icon */}
              <motion.div
                className="w-20 h-20 rounded-full mx-auto mb-6 bg-emerald-100 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                transition={{ scale: { type: 'spring', duration: 0.5 }, rotate: { duration: 0.5, delay: 0.3 } }}
              >
                <PartyPopper className="w-10 h-10 text-emerald-600" />
              </motion.div>

              <h2 className="text-2xl font-bold mb-3 text-foreground">
                축하합니다! 🎉
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed mb-8">
                모든 기능을 알아보셨습니다!<br />
                이제 자유롭게 사용해보세요.
              </p>

              <Button
                size="lg"
                onClick={handleComplete}
                className="min-h-[48px] text-base font-semibold px-8"
              >
                시작하기
                <Sparkles className="w-5 h-5 ml-1" />
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* ===== 가이드 오버레이 + 툴팁 ===== */}
        {active && !showWelcome && !showComplete && step && targetRect && !stepNotFound && (
          <motion.div
            key="guide-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            {/* Dark overlay with cutout */}
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <mask id="guide-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  <rect
                    x={targetRect.left - 6}
                    y={targetRect.top - 6}
                    width={targetRect.width + 12}
                    height={targetRect.height + 12}
                    rx="8"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.6)"
                mask="url(#guide-mask)"
              />
            </svg>

            {/* Pulsing highlight border on target */}
            <motion.div
              className="absolute pointer-events-none ring-4 ring-primary rounded-lg"
              style={{
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
              }}
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(59, 130, 246, 0.4)',
                  '0 0 0 8px rgba(59, 130, 246, 0)',
                  '0 0 0 0 rgba(59, 130, 246, 0.4)',
                ],
              }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            />

            {/* Bouncing pointer arrow */}
            <motion.div
              className="absolute pointer-events-none text-primary"
              style={{
                top: tooltipPos.arrowPosition === 'bottom'
                  ? tooltipPos.top - 4
                  : tooltipPos.arrowPosition === 'top'
                    ? tooltipPos.top + tooltipSize.height + 4
                    : tooltipPos.top + tooltipSize.height / 2 - 10,
                left: tooltipPos.arrowPosition === 'right'
                  ? tooltipPos.left - 4
                  : tooltipPos.arrowPosition === 'left'
                    ? tooltipPos.left + tooltipSize.width + 4
                    : tooltipPos.left + tooltipSize.width / 2 - 10,
              }}
              animate={{
                y: [0, 6, 0],
                x: [0, 0, 0],
              }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            >
              <ArrowIcon
                direction={tooltipPos.arrowPosition === 'bottom' ? 'top' : tooltipPos.arrowPosition === 'top' ? 'bottom' : tooltipPos.arrowPosition === 'left' ? 'right' : 'left'}
                className="w-6 h-6"
              />
            </motion.div>

            {/* Speech bubble tooltip */}
            <motion.div
              ref={tooltipRef}
              key={`tooltip-${currentStep}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="absolute bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 sm:p-6 w-[280px] sm:w-[340px]"
              style={{
                top: tooltipPos.top,
                left: tooltipPos.left,
              }}
            >
              {/* Step counter badge */}
              <div className="absolute -top-3 right-4">
                <Badge variant="secondary" className="bg-primary text-primary-foreground text-xs font-bold shadow-sm">
                  {currentStep + 1}/{totalSteps}
                </Badge>
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-foreground mb-2 pr-16">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                {step.description}
              </p>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-muted-foreground text-xs min-h-[44px]"
                >
                  건너뛰기
                </Button>

                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrev}
                      className="min-h-[44px] gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      이전
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="min-h-[44px] gap-1"
                  >
                    {currentStep >= totalSteps - 1 ? '완료' : '다음'}
                    {currentStep < totalSteps - 1 && <ChevronRight className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={handleSkip}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="안내 종료"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * 헤더용 도움말 버튼 (채팅 입력란·PWA 배너와 겹치지 않는 고정 위치)
 * 클릭 시 가이드 환영 화면을 연다.
 */
export function GuideTourHelpButton() {
  const openWelcome = useGuideTourStore((s) => s.openWelcome);
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={openWelcome}
      className="h-10 w-10 text-muted-foreground hover:text-primary"
      title="사용법 안내"
      aria-label="사용법 안내 시작"
      data-guide="help-btn"
    >
      <HelpCircle className="w-5 h-5" />
    </Button>
  );
}
