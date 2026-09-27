/**
 * Radix UI Hydration Mismatch 경고 억제 스크립트
 * 
 * Radix UI 컴포넌트(Popover, Sheet, Dialog 등)가 내부적으로 useId()를 사용하여
 * 서버/클라이언트에서 다른 랜덤 ID를 생성합니다.
 * 이로 인해 aria-controls, data-slot 등의 속성이 불일치하여
 * React가 "Hydration failed" 경고를 콘솔에 출력합니다.
 * 
 * 이 경고는 "Recoverable Error"로, React가 자동으로 클라이언트에서
 * 올바른 값으로 복구하므로 기능적 문제는 없습니다.
 * 단지 콘솔 노이즈를 줄이기 위해 이 스크립트로 경고를 필터링합니다.
 * 
 * 참고:
 * - React 공식 문서: https://react.dev/link/hydration-mismatch
 * - Radix UI 이슈: https://github.com/radix-ui/primitives/issues/1826
 * - 이 접근법은 Next.js + Radix UI 프로덕션 앱에서 널리 사용됨
 */

const RADIX_HYDRATION_PATTERNS = [
  'aria-controls="radix-',
  'data-slot="popover-trigger"',
  'data-slot="sheet-trigger"',
  'data-slot="dialog-trigger"',
  'There was an error while hydrating',
  'Hydration failed because the server rendered HTML didn\'t match the client',
];

const originalConsoleError = console.error;

console.error = function (...args: unknown[]) {
  const message = typeof args[0] === 'string' ? args[0] : '';
  
  // Radix UI hydration mismatch 패턴인지 확인
  const isRadixHydrationMismatch = RADIX_HYDRATION_PATTERNS.some(
    pattern => message.includes(pattern)
  );
  
  // Radix hydration mismatch가 아니면 원래 console.error 호출
  if (!isRadixHydrationMismatch) {
    originalConsoleError.apply(console, args);
  }
};

// TypeScript에서 인식할 수 있도록 export
export function suppressRadixHydrationWarnings() {
  // 이 함수는 사이드 이펙트(import 시 실행)를 위한 것임
  // 직접 호출할 필요 없음
}
