// 키오스크 감지 단일 기준 (21인치 1080p / 32인치 1920p+)
export type KioskMode = 'none' | 'kiosk-21' | 'kiosk-32';

export const KIOSK_21_MIN_WIDTH = 1080;
export const KIOSK_32_MIN_WIDTH = 1920;

// 전시장 무조작 복귀 (기본 5분)
export const KIOSK_IDLE_RESET_MS = 5 * 60 * 1000;

export function detectKioskMode(width: number): KioskMode {
  if (width >= KIOSK_32_MIN_WIDTH) return 'kiosk-32';
  if (width >= KIOSK_21_MIN_WIDTH) return 'kiosk-21';
  return 'none';
}

export function isKioskMode(mode: KioskMode): boolean {
  return mode === 'kiosk-21' || mode === 'kiosk-32';
}
