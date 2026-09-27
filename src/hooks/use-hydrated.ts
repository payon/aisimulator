'use client';

import { useSyncExternalStore } from 'react';

/**
 * SSR hydration 안전한 클라이언트 전용 값 읽기 훅
 * 
 * 서버에서는 serverValue를 반환하고, 클라이언트에서는 getClientValue()를 반환합니다.
 * useSyncExternalStore를 사용하여 hydration mismatch 없이 안전하게 브라우저 API 값을 읽습니다.
 * 
 * @example
 * // localStorage 값 읽기
 * const dismissed = useClientValue(
 *   false,                                    // 서버 기본값
 *   () => !!localStorage.getItem('dismissed')  // 클라이언트 값
 * );
 */
export function useClientValue<T>(serverValue: T, getClientValue: () => T): T {
  return useSyncExternalStore(
    // subscribe: 값이 변하지 않으므로 no-op
    () => () => {},
    // getSnapshot: 클라이언트에서 실제 값 반환
    getClientValue,
    // getServerSnapshot: SSR에서 서버 기본값 반환
    () => serverValue,
  );
}

/**
 * 컴포넌트가 클라이언트에서 hydrated되었는지 확인하는 훅
 * 서버에서는 false, 클라이언트에서는 true를 반환합니다.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
