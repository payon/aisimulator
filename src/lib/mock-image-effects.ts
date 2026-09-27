/**
 * 시뮬레이션/목업 모드에서 Canvas API로 이미지 효과를 적용하는 유틸리티
 * AI 호출 없이도 변환 결과를 시각적으로 보여주기 위해 사용
 */

// 이미지 스타일별 Canvas 필터 매핑
const STYLE_FILTERS: Record<string, string> = {
  watercolor: 'blur(1.5px) saturate(1.8) brightness(1.1) contrast(0.9)',
  oil: 'contrast(1.4) saturate(1.6) brightness(0.95)',
  cartoon: 'contrast(2.0) saturate(2.5) brightness(1.1)',
  vintage: 'sepia(0.7) contrast(1.1) brightness(0.9) saturate(0.8)',
  anime: 'saturate(2.0) brightness(1.15) contrast(1.2)',
  pencil: 'grayscale(1) contrast(2.0) brightness(1.3)',
};

// 나이별 노화 효과 필터
const AGE_FILTERS: Record<number, string> = {
  60: 'brightness(0.92) saturate(0.85) contrast(1.05)',
  70: 'brightness(0.88) saturate(0.75) contrast(1.08) sepia(0.15)',
  80: 'brightness(0.84) saturate(0.65) contrast(1.1) sepia(0.25)',
  90: 'brightness(0.80) saturate(0.55) contrast(1.12) sepia(0.35) grayscale(0.2)',
};

/**
 * base64 이미지를 Canvas로 로드
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Canvas API로 필터를 적용하여 이미지 변환
 * @param imageBase64 원본 이미지 (data URL)
 * @param filter CSS filter 문자열
 * @param overlayColor 선택적 오버레이 색상 (rgba)
 * @returns 변환된 이미지 data URL
 */
async function applyCanvasFilter(
  imageBase64: string,
  filter: string,
  overlayColor?: string
): Promise<string> {
  const img = await loadImage(imageBase64);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // 필터 적용
  ctx.filter = filter;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // 오버레이 색상 적용 (빈티지/노화 효과용)
  if (overlayColor) {
    ctx.filter = 'none';
    ctx.fillStyle = overlayColor;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }

  return canvas.toDataURL('image/png');
}

/**
 * 연필 스케치 효과 (단순 필터로는 한계가 있어 추가 처리)
 */
async function applyPencilEffect(imageBase64: string): Promise<string> {
  const img = await loadImage(imageBase64);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // 흑백 + 고대비
  ctx.filter = 'grayscale(1) contrast(2.5) brightness(1.4)';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // 엣지 강조를 위해 반전 이미지 블렌딩
  const canvas2 = document.createElement('canvas');
  canvas2.width = canvas.width;
  canvas2.height = canvas.height;
  const ctx2 = canvas2.getContext('2d')!;
  ctx2.filter = 'grayscale(1) invert(1) blur(1px) contrast(1.5)';
  ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);

  // color dodge blend
  ctx.globalCompositeOperation = 'color-dodge';
  ctx.drawImage(canvas2, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  return canvas.toDataURL('image/png');
}

/**
 * 시뮬레이션 모드에서 이미지 스타일 변환 적용
 */
export async function applyMockImageTransform(
  imageBase64: string,
  style: string
): Promise<string> {
  try {
    if (style === 'pencil') {
      return await applyPencilEffect(imageBase64);
    }

    const filter = STYLE_FILTERS[style] || 'saturate(1.2) contrast(1.1)';
    const overlayMap: Record<string, string> = {
      vintage: 'rgba(255, 240, 200, 0.15)',
      oil: 'rgba(255, 220, 150, 0.08)',
    };

    return await applyCanvasFilter(imageBase64, filter, overlayMap[style]);
  } catch (err) {
    console.warn('Mock image transform failed, returning original:', err);
    return imageBase64;
  }
}

/**
 * 시뮬레이션 모드에서 노화 효과 적용
 */
export async function applyMockAgingEffect(
  imageBase64: string,
  targetAge: number
): Promise<string> {
  try {
    const filter = AGE_FILTERS[targetAge] || AGE_FILTERS[70];

    // 노화 오버레이 - 나이가 많을수록 더 강한 색조
    const ageOverlayMap: Record<number, string> = {
      60: 'rgba(200, 180, 150, 0.08)',
      70: 'rgba(200, 180, 150, 0.12)',
      80: 'rgba(180, 160, 130, 0.18)',
      90: 'rgba(170, 150, 120, 0.25)',
    };

    return await applyCanvasFilter(imageBase64, filter, ageOverlayMap[targetAge]);
  } catch (err) {
    console.warn('Mock aging effect failed, returning original:', err);
    return imageBase64;
  }
}
