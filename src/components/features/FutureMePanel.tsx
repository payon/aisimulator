'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Upload, Download, RefreshCw, Heart, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { AGE_OPTIONS } from '@/types';
import { useCmsContent } from '@/hooks/use-cms-content';
import { useMockMode, formatMockSchedule } from '@/hooks/use-mock-mode';
import MockModeIndicator from '@/components/features/MockModeIndicator';
import { ResponsiveImage } from '@/components/ui/responsive-image';
import { applyMockAgingEffect } from '@/lib/mock-image-effects';

export default function FutureMePanel() {
  const { getContent } = useCmsContent();
  const { mockMode, mockSchedule } = useMockMode();
  const [mockMessage, setMockMessage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [futureImage, setFutureImage] = useState<string | null>(null);
  const [selectedAge, setSelectedAge] = useState<number | null>(null);
  const [healthTips, setHealthTips] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 서버와 동일한 허용 목록 (SVG/GIF 차단 — 스크립트 내장 위험)
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('JPG, PNG, WebP 파일만 업로드할 수 있습니다.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      setFutureImage(null);
      setHealthTips([]);
    };
    reader.readAsDataURL(file);
    toast.success('사진이 업로드되었습니다');
  };

  const handleGenerate = async () => {
    if (!uploadedImage || !selectedAge) {
      toast.error('사진과 나이를 선택해주세요');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/future-self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: uploadedImage, targetAge: selectedAge }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.mockMode) {
          if (data.preset && data.futureImage) {
            // 관리자가 등록한 나이별 체험 이미지 우선 표시 (오프라인 전시용)
            setFutureImage(data.futureImage);
          } else {
            // 미등록 시: Canvas API로 노화 효과 적용
            try {
              const mockResult = await applyMockAgingEffect(uploadedImage, selectedAge);
              setFutureImage(mockResult);
            } catch {
              setFutureImage(data.futureImage);
            }
          }
          setMockMessage(data.message || null);
        } else {
          setFutureImage(data.futureImage);
          setMockMessage(null);
        }
        setHealthTips(data.healthTips || []);
        toast.success('미래의 모습이 생성되었습니다!');
      } else {
        toast.error(data.error || '생성에 실패했습니다.');
      }
    } catch {
      toast.error('네트워크 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!futureImage) return;
    const link = document.createElement('a');
    link.href = futureImage;
    link.download = `future-me-${selectedAge}age.png`;
    link.click();
  };

  const handleReset = () => {
    setUploadedImage(null);
    setFutureImage(null);
    setSelectedAge(null);
    setHealthTips([]);
    setMockMessage(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b bg-card">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-semibold text-sm">{getContent('future.title', '미래의 나')}</h2>
          <p className="text-xs text-muted-foreground">{getContent('future.subtitle', 'AI로 미래의 내 모습을 만나보세요')}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* 시뮬레이션 모드 안내 */}
          {mockMode && (
            <MockModeIndicator feature="future" scheduleText={formatMockSchedule(mockSchedule)} />
          )}
          {/* Upload */}
          {!uploadedImage ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card
                className="border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{getContent('future.uploadTitle', '내 사진을 업로드하세요')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getContent('future.uploadDesc', '얼굴이 보이는 정면 사진을 올려주세요')}
                    </p>
                  </div>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    사진 선택
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <>
              {/* Age Selection */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-sm font-medium mb-3">맞이할 나이를 선택하세요</p>
                <div className="grid grid-cols-4 gap-3">
                  {AGE_OPTIONS.map((option) => (
                    <Card
                      key={option.age}
                      className={`cursor-pointer transition-all hover:shadow-md text-center ${
                        selectedAge === option.age ? 'ring-2 ring-primary shadow-md' : ''
                      }`}
                      onClick={() => setSelectedAge(option.age)}
                    >
                      <CardContent className="p-4">
                        <span className="text-3xl">{option.emoji}</span>
                        <p className="font-medium text-sm mt-1">{option.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>

              {/* Images comparison - 모바일: 세로, 태블릿+: 가로 */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="sm:flex-1 order-1">
                  <p className="text-sm font-medium mb-2">현재의 나</p>
                  <Card className="overflow-hidden">
                    <ResponsiveImage src={uploadedImage} alt="현재" variant="large" />
                  </Card>
                </div>
                <div className="sm:flex-1 order-2">
                  <p className="text-sm font-medium mb-2">미래의 나</p>
                  {isProcessing ? (
                    <Card className="h-56 sm:h-72 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                        >
                          <Sparkles className="w-10 h-10 text-primary" />
                        </motion.div>
                        <p className="text-sm text-muted-foreground">미래의 모습을 생성하고 있어요...</p>
                      </div>
                    </Card>
                  ) : futureImage ? (
                    <Card className="overflow-hidden">
                      <ResponsiveImage src={futureImage} alt="미래" variant="large" />
                    </Card>
                  ) : (
                    <Card className="h-56 sm:h-72 flex items-center justify-center border-dashed">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Sparkles className="w-8 h-8" />
                        <p className="text-sm">나이를 선택하면 생성됩니다</p>
                      </div>
                    </Card>
                  )}
                </div>
              </div>

              {/* Health Tips */}
              <AnimatePresence>
                {healthTips.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Card className="border-primary/20 bg-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Heart className="w-5 h-5 text-red-500" />
                          <h3 className="font-semibold text-sm">{selectedAge}대 건강 관리 팁</h3>
                        </div>
                        <ul className="space-y-2">
                          {healthTips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Shield className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 시뮬레이션 모드 메시지 */}
              {mockMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 whitespace-pre-wrap"
                >
                  {mockMessage}
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleGenerate}
                  disabled={!selectedAge || isProcessing}
                  className="px-8"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      미래 모습 생성
                    </>
                  )}
                </Button>
                {futureImage && (
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    저장하기
                  </Button>
                )}
                <Button variant="ghost" onClick={handleReset}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  다시하기
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
