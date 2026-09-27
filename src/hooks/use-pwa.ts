'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useClientValue } from '@/hooks/use-hydrated';

// === PWA 상태 타입 ===
export interface PWAState {
  isInstalled: boolean;
  isInstallable: boolean;
  isStandalone: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  isServiceWorkerReady: boolean;
  registration: ServiceWorkerRegistration | null;
  installPrompt: BeforeInstallPromptEvent | null;
}

// BeforeInstallPromptEvent 타입
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Service Worker 등록 함수
async function registerSW(
  onRegistered: (reg: ServiceWorkerRegistration) => void,
  onUpdateAvailable: () => void,
) {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    onRegistered(registration);

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            onUpdateAvailable();
          }
        }
      });
    });

    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
  }
}

// 서버/클라이언트 항상 일치하는 초기값 (hydration mismatch 방지)
const INITIAL_PWA_STATE: PWAState = {
  isInstalled: false,
  isInstallable: false,
  isStandalone: false,
  isOnline: true,
  isUpdateAvailable: false,
  isServiceWorkerReady: false,
  registration: null,
  installPrompt: null,
};

// === PWA Hook ===
export function usePWA() {
  // useClientValue로 hydration-safe하게 클라이언트 전용 상태 읽기
  const clientIsStandalone = useClientValue(false, () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://'),
  );
  const clientIsInstalled = useClientValue(false, () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://') ||
    window.matchMedia('(display-mode: fullscreen)').matches,
  );
  const clientIsOnline = useClientValue(true, () => navigator.onLine);

  const [state, setState] = useState<PWAState>(INITIAL_PWA_STATE);

  // 클라이언트 전용 상태를 state에 동기화
  const effectiveState: PWAState = {
    ...state,
    isStandalone: state.isStandalone || clientIsStandalone,
    isInstalled: state.isInstalled || clientIsInstalled,
    isOnline: state.isOnline && clientIsOnline,
  };

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // Service Worker 등록
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerSW(
        (reg) => setState(prev => ({ ...prev, registration: reg, isServiceWorkerReady: true })),
        () => setState(prev => ({ ...prev, isUpdateAvailable: true })),
      );
    }
  }, []);

  // 설치 프롬프트 이벤트 감지
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      deferredPromptRef.current = promptEvent;
      setState(prev => ({ ...prev, isInstallable: true, installPrompt: promptEvent }));
    };

    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      setState(prev => ({ ...prev, isInstalled: true, isInstallable: false, installPrompt: null }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // 온라인/오프라인 상태 감지
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // === 액션 ===

  const installApp = useCallback(async (): Promise<boolean> => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return false;

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      deferredPromptRef.current = null;
      setState(prev => ({ ...prev, installPrompt: null, isInstallable: false }));
      return outcome === 'accepted';
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
      return false;
    }
  }, []);

  const applyUpdate = useCallback(() => {
    if (!state.registration?.waiting) return;
    state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    const handleControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
  }, [state.registration]);

  const getCacheSize = useCallback(async (): Promise<number> => {
    if (!state.registration?.active) return 0;
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_SIZE') {
          resolve(event.data.size);
        }
      };
      state.registration.active?.postMessage({ type: 'GET_CACHE_SIZE' }, [channel.port2]);
    });
  }, [state.registration]);

  const clearCache = useCallback(async (): Promise<void> => {
    if (!state.registration?.active) return;
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve();
      state.registration.active?.postMessage({ type: 'CLEAR_CACHE' }, [channel.port2]);
    });
  }, [state.registration]);

  const clearApiCache = useCallback(async (): Promise<void> => {
    if (!state.registration?.active) return;
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve();
      state.registration.active?.postMessage({ type: 'CLEAR_API_CACHE' }, [channel.port2]);
    });
  }, [state.registration]);

  const subscribeToPush = useCallback(async (publicKey: string): Promise<PushSubscription | null> => {
    if (!state.registration) return null;
    try {
      const subscription = await state.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      return subscription;
    } catch (error) {
      console.error('[PWA] Push subscription failed:', error);
      return null;
    }
  }, [state.registration]);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!state.registration) return false;
    try {
      const subscription = await state.registration.pushManager.getSubscription();
      if (subscription) {
        return await subscription.unsubscribe();
      }
      return true;
    } catch (error) {
      console.error('[PWA] Push unsubscription failed:', error);
      return false;
    }
  }, [state.registration]);

  const getPushSubscription = useCallback(async (): Promise<PushSubscription | null> => {
    if (!state.registration) return null;
    return await state.registration.pushManager.getSubscription();
  }, [state.registration]);

  return {
    ...effectiveState,
    installApp,
    applyUpdate,
    getCacheSize,
    clearCache,
    clearApiCache,
    subscribeToPush,
    unsubscribeFromPush,
    getPushSubscription,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
