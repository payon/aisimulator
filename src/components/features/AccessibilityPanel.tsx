'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Accessibility,
  Type,
  Contrast,
  Volume2,
  Hand,
  RotateCcw,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Mic,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useSettingsStore } from '@/stores/index';
import type { FontSize } from '@/types';
import type { TtsStatus } from '@/hooks/use-voice';

const FONT_SIZES: { value: FontSize; label: string; preview: string; description: string }[] = [
  { value: 'small', label: '작게', preview: '14px', description: '기본 크기' },
  { value: 'medium', label: '보통', preview: '16px', description: '표준 크기' },
  { value: 'large', label: '크게', preview: '20px', description: '시니어 추천' },
  { value: 'xlarge', label: '매우 크게', preview: '24px', description: '시력 보조' },
];

// TTS 상태 라벨 매핑
const TTS_STATUS_INFO: Record<TtsStatus, { label: string; color: string; icon: 'loading' | 'error' | 'success' | 'speaking' }> = {
  unsupported: { label: '음성 미지원', color: 'text-destructive', icon: 'error' },
  'finding-voice': { label: '음성 찾는 중...', color: 'text-amber-600', icon: 'loading' },
  'warming-up': { label: '음성 준비 중...', color: 'text-amber-600', icon: 'loading' },
  ready: { label: '음성 준비 완료', color: 'text-emerald-600', icon: 'success' },
  speaking: { label: '읽는 중...', color: 'text-primary', icon: 'speaking' },
  paused: { label: '일시정지', color: 'text-amber-600', icon: 'loading' },
  error: { label: '음성 오류', color: 'text-destructive', icon: 'error' },
};

interface AccessibilityPanelProps {
  ttsStatus?: TtsStatus;
  ttsVoiceName?: string | null;
  ttsKoreanVoiceFound?: boolean;
  onWarmUp?: () => void;
  onTestSpeak?: () => void;
}

export default function AccessibilityPanel({
  ttsStatus = 'ready',
  ttsVoiceName = null,
  ttsKoreanVoiceFound = false,
  onWarmUp,
  onTestSpeak,
}: AccessibilityPanelProps) {
  const {
    fontSize,
    highContrast,
    voiceEnabled,
    readingSpeed,
    touchTargetLarge,
    language,
    setFontSize,
    toggleHighContrast,
    setVoiceEnabled,
    setReadingSpeed,
    setTouchTargetLarge,
    setLanguage,
  } = useSettingsStore();

  const [open, setOpen] = useState(false);

  const handleReset = () => {
    setFontSize('large'); // 시니어 기본값
    if (highContrast) toggleHighContrast();
    setVoiceEnabled(true);
    setReadingSpeed(0.8);
    setTouchTargetLarge(true);
  };

  // 속도 라벨 표시
  const speedLabel = (speed: number): string => {
    if (speed <= 0.6) return '매우 느리게';
    if (speed <= 0.8) return '느리게';
    if (speed <= 1.0) return '보통';
    return '빠르게';
  };

  const statusInfo = TTS_STATUS_INFO[ttsStatus];
  const needsWarmUp = ttsStatus === 'warming-up';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10"
          aria-label="접근성 설정"
        >
          <Accessibility className="w-5 h-5" />
          {(fontSize === 'xlarge' || highContrast) && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[360px] sm:w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Accessibility className="w-5 h-5 text-primary" />
            접근성 설정
          </SheetTitle>
          <SheetDescription>
            글자 크기, 음성, 화면 설정을 변경할 수 있습니다
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* 글자 크기 */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Type className="w-4 h-4" />
              글자 크기
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {FONT_SIZES.map((size) => (
                <button
                  key={size.value}
                  onClick={() => setFontSize(size.value)}
                  className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                    fontSize === size.value
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-transparent bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <span
                    className="font-bold mb-1"
                    style={{ fontSize: size.preview }}
                  >
                    가
                  </span>
                  <span className="text-xs font-medium">{size.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {size.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* 고대비 모드 */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Contrast className="w-4 h-4" />
              고대비 모드
            </Label>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">고대비 색상</p>
                <p className="text-xs text-muted-foreground">
                  글자와 배경의 대비를 높입니다
                </p>
              </div>
              <Switch
                checked={highContrast}
                onCheckedChange={toggleHighContrast}
              />
            </div>
            {highContrast && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-2 bg-primary/5 rounded-lg text-xs text-muted-foreground"
              >
                고대비 모드가 활성화되었습니다. 모든 텍스트와 버튼이 더 선명하게 표시됩니다.
              </motion.div>
            )}
          </div>

          <Separator />

          {/* 음성 (TTS) */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Volume2 className="w-4 h-4" />
              음성 읽기 (TTS)
            </Label>

            {/* TTS 상태 표시 */}
            <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg">
              {statusInfo.icon === 'loading' && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
              )}
              {statusInfo.icon === 'error' && (
                <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              )}
              {statusInfo.icon === 'success' && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
              {statusInfo.icon === 'speaking' && (
                <Volume2 className="w-3.5 h-3.5 text-primary animate-pulse" />
              )}
              <span className={`text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {ttsVoiceName && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
                  {ttsVoiceName.length > 20 ? ttsVoiceName.substring(0, 20) + '...' : ttsVoiceName}
                </Badge>
              )}
            </div>

            {/* 음성 활성화 토글 */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">AI 답변 음성 출력</p>
                <p className="text-xs text-muted-foreground">
                  AI가 답변을 소리 내어 읽어줍니다
                </p>
              </div>
              <Switch
                checked={voiceEnabled}
                onCheckedChange={setVoiceEnabled}
              />
            </div>

            {voiceEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3"
              >
                {/* 읽기 속도 슬라이더 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">읽기 속도</Label>
                    <Badge variant="secondary" className="text-xs px-2 py-0">
                      {readingSpeed.toFixed(1)}x · {speedLabel(readingSpeed)}
                    </Badge>
                  </div>
                  <Slider
                    value={[readingSpeed]}
                    onValueChange={(values: number[]) => {
                      if (values.length > 0) {
                        setReadingSpeed(values[0]);
                      }
                    }}
                    min={0.5}
                    max={1.2}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>느리게 (0.5x)</span>
                    <span>보통 (0.8x)</span>
                    <span>빠르게 (1.2x)</span>
                  </div>
                </div>

                {/* iOS Safari 웜업 버튼 */}
                {needsWarmUp && onWarmUp && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onWarmUp}
                    className="w-full gap-2 text-xs"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    음성 엔진 활성화 (필요)
                  </Button>
                )}

                {/* 음성 테스트 버튼 */}
                {ttsKoreanVoiceFound && onTestSpeak && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onTestSpeak}
                    className="w-full gap-2 text-xs"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    음성 테스트 듣기
                  </Button>
                )}

                {/* 한국어 음성 미발견 안내 */}
                {!ttsKoreanVoiceFound && ttsStatus === 'ready' && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700">
                      한국어 음성을 찾지 못했습니다. 브라우저나 OS에서 한국어 음성을 설치하면 더 자연스러운 발음을 들을 수 있습니다.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          <Separator />

          {/* 터치 영역 */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Hand className="w-4 h-4" />
              터치 영역
            </Label>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">큰 터치 영역</p>
                <p className="text-xs text-muted-foreground">
                  버튼과 링크를 더 크게 만듭니다
                </p>
              </div>
              <Switch
                checked={touchTargetLarge}
                onCheckedChange={setTouchTargetLarge}
              />
            </div>
          </div>

          <Separator />

          {/* 언어 */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Type className="w-4 h-4" />
              언어 / Language
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'ko', label: '한국어' },
                { value: 'en', label: 'English' },
              ].map((l) => (
                <button
                  key={l.value}
                  onClick={() => {
                    setLanguage(l.value);
                    // CMS 표시 언어 즉시 동기화 (이벤트 핸들러에서 호출)
                    import('@/hooks/use-cms-content').then((m) => m.setCmsLanguage(l.value));
                  }}
                  className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                    language === l.value
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-transparent bg-muted/50 hover:bg-muted'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              관리자가 등록한 번역(en.* 콘텐츠)이 있으면 해당 언어로 표시됩니다.
            </p>
          </div>

          <Separator />

          {/* 초기화 */}
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            시니어 기본값으로 초기화
          </Button>

          <div className="p-3 bg-primary/5 rounded-lg">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>팁:</strong> 시니어 사용자는 글자 크기 &quot;크게&quot;와 음성 읽기를
              함께 사용하면 더 편리합니다. 고대비 모드는 야외나 밝은 곳에서 유용합니다.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
