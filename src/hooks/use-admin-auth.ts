'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminStore } from '@/stores/admin-store';

export type LoginResult =
  | { ok: true }
  | { ok: false; error?: string }
  | { ok: false; totpRequired: true; tempToken: string }
  | { ok: false; mustChangeRequired: true; tempToken: string };

interface UseAdminAuthReturn {
  isAuthenticated: boolean;
  user: { id: string; email: string; name: string; role: string } | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyTotp: (tempToken: string, totp: string) => Promise<boolean>;
  changePassword: (payload: { tempToken: string; newPassword: string }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  isLoading: boolean;
}

export function useAdminAuth(): UseAdminAuthReturn {
  const { isAuthenticated, token, user, login: storeLogin, logout: storeLogout, checkAuth: storeCheckAuth } = useAdminStore();
  const [isLoading, setIsLoading] = useState(false);
  // 중복 로그아웃 방지
  const logoutTriggeredRef = useRef(false);

  // hydration 후 서버에 세션 유효성 확인 (쿠키 전송 포함)
  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');
    const verify = (tok?: string) => {
      const headers: Record<string, string> = {};
      if (tok) headers['Authorization'] = `Bearer ${tok}`;
      setIsLoading(true);
      fetch('/api/admin/auth', { method: 'GET', headers, credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && data.user) {
            // 토큰이 있으면 스토어 유지, 쿠키 전용이면 세션만 표시
            if (tok) storeLogin(tok, data.user);
            else storeLogin('', data.user);
          } else {
            storeLogout();
          }
        })
        .catch(() => {
          storeCheckAuth();
        })
        .finally(() => {
          setIsLoading(false);
        });
    };
    if (storedToken && !isAuthenticated) {
      verify(storedToken);
    } else if (!storedToken && !isAuthenticated) {
      // 쿠키 세션 확인 (HttpOnly)
      verify(undefined);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error };

      if (data.totpRequired) return { ok: false, totpRequired: true, tempToken: data.tempToken };
      if (data.mustChangeRequired) return { ok: false, mustChangeRequired: true, tempToken: data.tempToken };
      if (data.token && data.user) {
        storeLogin(data.token, data.user);
        return { ok: true };
      }
      return { ok: false };
    } catch {
      return { ok: false };
    } finally {
      setIsLoading(false);
    }
  }, [storeLogin]);

  const verifyTotp = useCallback(async (tempToken: string, totp: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tempToken, totp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return false;
      if (data.mustChangeRequired) return false;
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

  const changePassword = useCallback(async (payload: { tempToken: string; newPassword: string }) => {
    try {
      const res = await fetch('/api/admin/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error };
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }, []);

  const logout = useCallback(async () => {
    // 서버에 세션 삭제 요청
    const currentToken = useAdminStore.getState().token;
    const headers: Record<string, string> = {};
    if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
    try {
      await fetch('/api/admin/auth', { method: 'DELETE', headers, credentials: 'include' });
    } catch {
      // 네트워크 오류 무시 - 클라이언트 정리는 계속 진행
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

    // HttpOnly 쿠키 세션도 함께 전송
    const response = await fetch(url, { ...options, headers, credentials: 'include' });

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
    verifyTotp,
    changePassword,
    logout,
    authenticatedFetch,
    isLoading,
  };
}
