// PWA 아이콘 레지스트리 (단일 정본)
// manifest.json·생성 스크립트·관리자 CRUD가 이 목록을 공유한다.

export type PwaIconGroup = 'app' | 'shortcut' | 'screenshot' | 'system';

export interface PwaIconSpec {
  file: string; // public/icons/ 파일명
  width: number;
  height: number;
  group: PwaIconGroup;
  label: string;
  targets: string; // 어떤 화면/환경에서 쓰이는지
}

export const PWA_ICON_GROUPS: { key: PwaIconGroup; label: string; desc: string }[] = [
  { key: 'app', label: '앱 아이콘', desc: '홈화면·스플래시 — 모바일/태블릿/데스크톱/키오스크 공용' },
  { key: 'shortcut', label: '바로가기', desc: 'Android 아이콘 롱프레스 바로가기 4종' },
  { key: 'screenshot', label: '설치 미리보기', desc: '스토어·브라우저 설치 화면에 표시되는 미리보기' },
  { key: 'system', label: '시스템', desc: '알림 배지·iOS·브라우저 탭' },
];

export const PWA_ICONS: PwaIconSpec[] = [
  { file: 'icon-72x72.png', width: 72, height: 72, group: 'app', label: '앱 아이콘 72', targets: '구형 Android 홈화면' },
  { file: 'icon-96x96.png', width: 96, height: 96, group: 'app', label: '앱 아이콘 96', targets: 'Android 홈화면(저해상도)' },
  { file: 'icon-128x128.png', width: 128, height: 128, group: 'app', label: '앱 아이콘 128', targets: 'Android 홈화면·태블릿' },
  { file: 'icon-144x144.png', width: 144, height: 144, group: 'app', label: '앱 아이콘 144', targets: 'Android 홈화면(고해상도)' },
  { file: 'icon-192x192.png', width: 192, height: 192, group: 'app', label: '앱 아이콘 192', targets: 'Android 설치·스플래시 화면 (모바일/태블릿 권장 최소)' },
  { file: 'icon-384x384.png', width: 384, height: 384, group: 'app', label: '앱 아이콘 384', targets: '고해상도 스플래시 (태블릿/데스크톱)' },
  { file: 'icon-512x512.png', width: 512, height: 512, group: 'app', label: '앱 아이콘 512', targets: '마스크블·고해상도 스플래시 (데스크톱/21"/32" 키오스크, PWA 필수)' },
  { file: 'shortcut-chat.png', width: 96, height: 96, group: 'shortcut', label: '바로가기: AI 대화', targets: 'Android 바로가기' },
  { file: 'shortcut-image.png', width: 96, height: 96, group: 'shortcut', label: '바로가기: 이미지 변환', targets: 'Android 바로가기' },
  { file: 'shortcut-future.png', width: 96, height: 96, group: 'shortcut', label: '바로가기: 미래의 나', targets: 'Android 바로가기' },
  { file: 'shortcut-quiz.png', width: 96, height: 96, group: 'shortcut', label: '바로가기: AI 퀴즈', targets: 'Android 바로가기' },
  { file: 'screenshot-wide.png', width: 1280, height: 720, group: 'screenshot', label: '미리보기 와이드', targets: '설치 화면 — 데스크톱·21"/32" 키오스크' },
  { file: 'screenshot-narrow.png', width: 720, height: 1280, group: 'screenshot', label: '미리보기 내로우', targets: '설치 화면 — 모바일·태블릿' },
  { file: 'badge-72x72.png', width: 72, height: 72, group: 'system', label: '알림 배지', targets: 'Android 푸시 알림 배지' },
  { file: 'apple-touch-icon.png', width: 180, height: 180, group: 'system', label: 'Apple 터치 아이콘', targets: 'iOS 홈화면 (모바일/태블릿)' },
  { file: 'favicon-32x32.png', width: 32, height: 32, group: 'system', label: '파비콘 32', targets: '데스크톱 브라우저 탭' },
  { file: 'favicon-16x16.png', width: 16, height: 16, group: 'system', label: '파비콘 16', targets: '데스크톱 브라우저 탭(소형)' },
];

export function findPwaIcon(file: string): PwaIconSpec | undefined {
  return PWA_ICONS.find((s) => s.file === file);
}
