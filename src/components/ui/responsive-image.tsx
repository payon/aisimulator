'use client';

import type { SyntheticEvent } from 'react';
import { cn } from '@/lib/utils';

type ResponsiveImageVariant = 'default' | 'large' | 'thumb';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  variant?: ResponsiveImageVariant;
  className?: string;
  imgClassName?: string;
  onError?: (e: SyntheticEvent<HTMLImageElement>) => void;
}

/**
 * 화면 맞춤형 자동 사이징 이미지
 * - 모바일/태블릿/데스크톱: 브레이크포인트별 높이 자동 조정
 * - 21"/32" 키오스크: 루트의 .kiosk-21/.kiosk-32 클래스로 뷰포트 비례 확대
 * - 시니어 가독성을 위해 항상 object-contain (잘림 없음)
 */
export function ResponsiveImage({ src, alt, variant = 'default', className, imgClassName, onError }: ResponsiveImageProps) {
  return (
    <div className={cn('senior-img-frame', `senior-img-${variant}`, className)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        draggable={false}
        onError={onError}
        className={cn('senior-img-el', imgClassName)}
      />
    </div>
  );
}
