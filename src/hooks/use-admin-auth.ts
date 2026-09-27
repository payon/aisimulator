'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminStore } from '@/stores/admin-store';

interface UseAdminAuthReturn {
  isAuthenticated: boolean;
  user: { id: string; email: string; name: string; role: string } | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  isLoading: boolean;
}

export function useAdminAuth(): UseAdminAuthReturn {
  const { isAuthenticated, token, user, login: storeLogin, logout: storeLogout, checkAuth: storeCheckAuth } = useAdminStore();
  const [isLoading, setIsLoading] = useState(false);
  // 중복 로그아웃 방지
  const logoutTriggeredRef = useRef(false);

  // hydration 후 서버에 세션 유효성 확인
  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');
    if (storedToken && !isAuthenticated) {
      setIsLoading(true);
      // 서버에 세션이 유효한지 확인
      fetch('/api/admin/auth', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${storedToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && data.user) {
            // 세션이 유효함 - 스토어 업데이트
            storeLogin(storedToken, data.user);
          } else {
            // 세션이 만료됨 - 로컬 스토리지 정리
            storeLogout();
          }
        })
        .catch(() => {
          // 네트워크 오류 - 오프라인 상태면 기존 토큰 유지
          storeCheckAuth();
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data.token && data.user) {
        storeLogin(data.token, data.user);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [storeLogin]);

  const logout = useCallback(async () => {
    // 서버에 세션 삭제 요청
    const currentToken = useAdminStore.getState().token;
    if (currentToken) {
      try {
        await fetch('/api/admin/auth', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${currentToken}` },
        });
      } catch {
        // 네트워크 오류 무시 - 클라이언트 정리는 계속 진행
      }
    }
    storeLogout();
  }, [storeLogout]);

  // 401 응답 시 자동 로그아웃 처리
  const handleUnauthorized = useCallback(() => {
    if (!logoutTriggeredRef.current) {
      logoutTriggeredRef.current = true;
      storeLogout();
      // 다음 마운트에서 리셋
      setTimeout(() => {
        logoutTriggeredRef.current = false;
      }, 1000);
    }
  }, [storeLogout]);

  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const currentToken = useAdminStore.getState().token;
    const headers = new Headers(options.headers || {});
    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }
    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, { ...options, headers });

    // 401 = 세션 만료 → 자동 로그아웃
    if (response.status === 401) {
      handleUnauthorized();
    }

    return response;
  }, [handleUnauthorized]);

  return {
    isAuthenticated,
    user,
    login,
    logout,
    authenticatedFetch,
    isLoading,
  };
}
