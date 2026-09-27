'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useClientValue } from '@/hooks/use-hydrated';

interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  priority?: 'normal' | 'high';
}

// === 푸시 알림 관리자 ===
export function PWANotificationManager() {
  // useClientValue로 hydration-safe하게 브라우저 API 값 읽기
  const notificationSupported = useClientValue(false, () => 'Notification' in window);
  const initialPermission = useClientValue<NotificationPermission>(
    'default',
    () => typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const effectivePermission = permission !== 'default' ? permission : initialPermission;

  const requestPermission = useCallback(async () => {
    if (!notificationSupported) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, [notificationSupported]);

  // 로컬 알림 표시 (푸시 서버 없이도 동작)
  const showLocalNotification = useCallback(async (data: NotificationData) => {
    if (effectivePermission !== 'granted') {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return;
    }

    const registration = await navigator.serviceWorker?.ready;
    if (registration) {
      registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        tag: `ai-platform-${Date.now()}`,
        data: { url: data.url || '/' },
        actions: [
          { action: 'open', title: '열기' },
          { action: 'dismiss', title: '닫기' },
        ],
      });
    }
  }, [effectivePermission]);

  return {
    supported: notificationSupported,
    permission: effectivePermission,
    requestPermission,
    showLocalNotification,
    isGranted: effectivePermission === 'granted',
    isDenied: effectivePermission === 'denied',
  };
}

// === 알림 권한 요청 배너 ===
export function NotificationPermissionBanner() {
  // useClientValue로 hydration-safe하게 브라우저 API 값 읽기
  const storageDismissed = useClientValue(
    false,
    () => !!localStorage.getItem('notif-permission-dismissed'),
  );
  const shouldShowByPermission = useClientValue(
    false,
    () =>
      typeof Notification !== 'undefined' &&
      Notification.permission !== 'granted' &&
      Notification.permission !== 'denied',
  );
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // 10초 후 자동 닫기
  useEffect(() => {
    if (dismissed || storageDismissed || !shouldShowByPermission) return;
    const timer = setTimeout(() => {
      setDismissed(true);
      localStorage.setItem('notif-permission-dismissed', 'true');
    }, 10000);
    return () => clearTimeout(timer);
  }, [dismissed, storageDismissed, shouldShowByPermission]);

  // storage에서 이미 dismissed 거나 권한이 이미 결정되었으면 표시 안 함
  if (dismissed || storageDismissed || !shouldShowByPermission) {
    return null;
  }

  const handleRequest = async () => {
    setRequesting(true);
    await Notification.requestPermission();
    setRequesting(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('notif-permission-dismissed', 'true');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="shrink-0"
      >
        <Card className="mx-4 my-2 p-3 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">알림을 허용하시겠습니까?</p>
              <p className="text-[10px] text-muted-foreground">새로운 소식과 업데이트를 받을 수 있습니다</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button size="sm" onClick={handleRequest} disabled={requesting} className="h-7 px-2.5 text-[11px]">
                허용
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-7 px-2 text-[11px]">
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
