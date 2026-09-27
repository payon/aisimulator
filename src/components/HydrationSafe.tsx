'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

/**
 * HydrationSafe - Radix UI hydration mismatch를 방지하는 래퍼
 * 
 * 문제: Radix UI(Popover, Sheet, Dialog)가 useId()로 서버/클라이언트에서
 * 각각 다른 랜덤 ID를 생성하여 aria-controls 속성이 불일치함
 * 
 * 해결: 서버와 클라이언트 초기 렌더에서 동일한 placeholder를 보여주고,
 * 클라이언트 마운트 후에만 실제 Radix 컴포넌트(children)를 렌더링
 * 
 * 사용법:
 * <HydrationSafe fallback={<Button variant="ghost" size="icon">...</Button>}>
 *   <NotificationSystem />
 * </HydrationSafe>
 */
export function HydrationSafe({ 
  children, 
  fallback 
}: { 
  children: ReactNode; 
  fallback: ReactNode;
}) {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,   // 클라이언트: 마운트됨 → children 렌더링
    () => false   // 서버: 마운트 안 됨 → fallback 렌더링
  );

  return mounted ? <>{children}</> : <>{fallback}</>;
}

function noopSubscribe() {
  return () => {};
}
