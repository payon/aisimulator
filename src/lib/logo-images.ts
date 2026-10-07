// 사이트 로고 레지스트리 (단일 정본)
// 화면별 최적 크기로 자동 리사이즈되어 저장된다.
// 저장 위치: public/uploads/logo/ (uploads 볼륨에 포함되어 컨테이너 재배포에도 유지)
// 로고는 잘리면 안 되므로 contain(여백 투명)으로 조정한다 (PWA 아이콘의 cover와 다름).

export type LogoTarget = 'mobile' | 'tablet' | 'desktop' | 'kiosk-21' | 'kiosk-24' | 'kiosk-32';

export interface LogoSpec {
  file: string; // public/uploads/logo/ 파일명
  width: number;
  height: number;
  target: LogoTarget;
  label: string;
  targets: string; // 어떤 화면에서 쓰이는지
}

export const LOGO_DIR = 'logo';

export const LOGO_IMAGES: LogoSpec[] = [
  { file: 'logo-mobile.png', width: 192, height: 192, target: 'mobile', label: '모바일용 로고', targets: '스마트폰 (360~480px 화면)' },
  { file: 'logo-tablet.png', width: 256, height: 256, target: 'tablet', label: '태블릿용 로고', targets: '태블릿 (768~1024px 화면)' },
  { file: 'logo-desktop.png', width: 384, height: 384, target: 'desktop', label: '데스크톱용 로고', targets: 'PC 브라우저 (1280px 이상)' },
  { file: 'logo-kiosk-21.png', width: 512, height: 512, target: 'kiosk-21', label: '21인치 키오스크용', targets: '21" 키오스크 (1080p)' },
  { file: 'logo-kiosk-24.png', width: 640, height: 640, target: 'kiosk-24', label: '24인치 키오스크용', targets: '24" 키오스크' },
  { file: 'logo-kiosk-32.png', width: 768, height: 768, target: 'kiosk-32', label: '32인치 키오스크용', targets: '32" 키오스크 (1920p 이상)' },
];

export function findLogoImage(file: string): LogoSpec | undefined {
  return LOGO_IMAGES.find((s) => s.file === file);
}

export function logoUrlOf(spec: LogoSpec): string {
  return `/uploads/${LOGO_DIR}/${spec.file}`;
}
