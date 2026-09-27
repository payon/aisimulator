'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

/**
 * ClientOnly - 하이드레이션 후에만 자식을 렌더링합니다.
 * 
 * Radix UI 컴포넌트(Popover, Sheet, Dialog 등)이 
 * 서버/클라이언트에서 다른 랜덤 ID를 생성하여 
 * hydration mismatch 오류가 발생하는 것을 방지합니다.
 * 
 * useSyncExternalStore를 사용하여 SSR-safe하게 
 * 클라이언트 마운트 상태를 감지합니다.
 */
export function ClientOnly({ 
  children, 
  fallback 
}: { 
  children: ReactNode; 
  fallback?: ReactNode;
}) {
  const mounted = useSyncExternalStore(
    subscribe,    // noop 구독
    () => true,   // 클라이언트 스냅샷: 마운트됨
    () => false   // 서버 스냅샷: 마운트 안 됨
  );

  if (!mounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// noop 구독 함수 (상태 변경 없음)
function subscribe() {
  return () => {};
}
