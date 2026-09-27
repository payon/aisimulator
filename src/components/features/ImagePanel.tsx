'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon, Upload, Download, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { ImageStyle } from '@/types';
import { IMAGE_STYLES } from '@/types';
import { useCmsContent } from '@/hooks/use-cms-content';
import { useMockMode, formatMockSchedule } from '@/hooks/use-mock-mode';
import MockModeIndicator from '@/components/features/MockModeIndicator';
import { ResponsiveImage } from '@/components/ui/responsive-image';
import { applyMockImageTransform } from '@/lib/mock-image-effects';

export default function ImagePanel() {
  const { getContent } = useCmsContent();
  const { mockMode, mockSchedule } = useMockMode();
  const [mockMessage, setMockMessage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle | null>(null);
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
      setSelectedImage(reader.result as string);
      setTransformedImage(null);
    };
    reader.readAsDataURL(file);
    toast.success('이미지가 업로드되었습니다');
  };

  const handleTransform = async () => {
    if (!selectedImage || !selectedStyle) {
      toast.error('이미지와 스타일을 선택해주세요');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: selectedImage, style: selectedStyle }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.mockMode) {
          if (data.preset && data.transformedImage) {
            // 관리자가 등록한 체험 결과 이미지 우선 표시 (오프라인 전시용)
            setTransformedImage(data.transformedImage);
          } else {
            // 미등록 시: Canvas API로 시각적 효과 적용
            try {
              const mockResult = await applyMockImageTransform(selectedImage, selectedStyle);
              setTransformedImage(mockResult);
            } catch {
              setTransformedImage(data.transformedImage);
            }
          }
          setMockMessage(data.message || null);
        } else {
          setTransformedImage(data.transformedImage);
          setMockMessage(null);
        }
        toast.success('이미지 변환이 완료되었습니다!');
      } else {
        toast.error(data.error || '이미지 변환에 실패했습니다.');
      }
    } catch {
      toast.error('네트워크 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!transformedImage) return;
    const link = document.createElement('a');
    link.href = transformedImage;
    link.download = `transformed-${Date.now()}.png`;
    link.click();
    toast.success('이미지가 다운로드됩니다');
  };

  const handleReset = () => {
    setSelectedImage(null);
    setTransformedImage(null);
    setSelectedStyle(null);
    setMockMessage(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b bg-card">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <ImageIcon className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-semibold text-sm">{getContent('image.title', '이미지 변환')}</h2>
          <p className="text-xs text-muted-foreground">{getContent('image.subtitle', 'AI로 이미지 스타일을 변환하세요')}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* 시뮬레이션 모드 안내 */}
          {mockMode && (
            <MockModeIndicator feature="image" scheduleText={formatMockSchedule(mockSchedule)} />
          )}
          {/* Upload Area */}
          {!selectedImage ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card
                className="border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{getContent('image.uploadTitle', '이미지를 업로드하세요')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getContent('image.uploadDesc', 'JPG, PNG, WebP 파일 (최대 10MB)')}
                    </p>
                  </div>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    파일 선택
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
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Original - 항상 좌측(또는 상단) */}
              <div className="sm:flex-1 order-1">
                <p className="text-sm font-medium mb-2">원본 이미지</p>
                <Card className="overflow-hidden">
                  <ResponsiveImage src={selectedImage} alt="원본" />
                </Card>
              </div>

              {/* Transformed - 항상 우측(또는 하단) */}
              <div className="sm:flex-1 order-2">
                <p className="text-sm font-medium mb-2">변환된 이미지</p>
                {isProcessing ? (
                  <Card className="h-48 sm:h-64 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">이미지 변환 중...</p>
                    </div>
                  </Card>
                ) : transformedImage ? (
                  <Card className="overflow-hidden relative">
                    <ResponsiveImage src={transformedImage} alt="변환됨" />
                  </Card>
                ) : (
                  <Card className="h-48 sm:h-64 flex items-center justify-center border-dashed">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Sparkles className="w-8 h-8" />
                      <p className="text-sm">스타일을 선택하면 변환됩니다</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Style Selection */}
          {selectedImage && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-sm font-medium mb-3">변환 스타일 선택</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {IMAGE_STYLES.map((style) => (
                  <Card
                    key={style.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedStyle === style.id ? 'ring-2 ring-primary shadow-md' : ''
                    }`}
                    onClick={() => setSelectedStyle(style.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <span className="text-2xl">{style.emoji}</span>
                      <p className="font-medium text-sm mt-1">{style.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{style.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

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

          {/* Action Buttons */}
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 justify-center"
            >
              <Button
                onClick={handleTransform}
                disabled={!selectedStyle || isProcessing}
                className="px-8"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    변환 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    변환하기
                  </>
                )}
              </Button>
              {transformedImage && (
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  다운로드
                </Button>
              )}
              <Button variant="ghost" onClick={handleReset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                다시하기
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
