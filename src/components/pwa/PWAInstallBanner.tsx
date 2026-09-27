'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePWA } from '@/hooks/use-pwa';
import { useClientValue } from '@/hooks/use-hydrated';

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, isStandalone, installApp } = usePWA();
  // useClientValue로 hydration-safe하게 localStorage 읽기 (새로고침 후에도 유지)
  const storageDismissed = useClientValue(
    false,
    () => !!localStorage.getItem('pwa-install-dismissed'),
  );
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  // 이미 설치되었거나 standalone 모드면 표시하지 않음
  if (isInstalled || isStandalone || dismissed || storageDismissed || !isInstallable) return null;

  const handleInstall = async () => {
    setInstalling(true);
    const accepted = await installApp();
    setInstalling(false);
    if (!accepted) {
      // 사용자가 거부한 경우 잠시 숨김
      setDismissed(true);
      localStorage.setItem('pwa-install-dismissed', 'true');
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm"
      >
        <Card className="p-4 shadow-lg border-primary/20 bg-card">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">앱으로 설치하기</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                홈 화면에 추가하면 더 빠르고 편리하게 사용할 수 있습니다
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  disabled={installing}
                  className="h-8 px-3 text-xs gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  {installing ? '설치 중...' : '홈 화면에 추가'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-8 px-2 text-xs"
                >
                  나중에
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground p-1 -mt-1 -mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// === 설치 버튼 (인라인용) ===
export function PWAInstallButton({ className }: { className?: string }) {
  const { isInstallable, isInstalled, isStandalone, installApp } = usePWA();
  const [installing, setInstalling] = useState(false);

  if (isInstalled || isStandalone) {
    return (
      <Button variant="outline" size="sm" className={className} disabled>
        <Smartphone className="w-4 h-4 mr-2" />
        설치됨
      </Button>
    );
  }

  if (!isInstallable) return null;

  const handleInstall = async () => {
    setInstalling(true);
    await installApp();
    setInstalling(false);
  };

  return (
    <Button size="sm" onClick={handleInstall} disabled={installing} className={className}>
      <Download className="w-4 h-4 mr-2" />
      {installing ? '설치 중...' : '앱 설치'}
    </Button>
  );
}

// === PWA 상태 배지 ===
export function PWAStatusBadge({ className }: { className?: string }) {
  const { isStandalone, isInstalled } = usePWA();

  if (!isInstalled && !isStandalone) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary ${className || ''}`}
    >
      {isStandalone ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
      {isStandalone ? '앱 모드' : '설치됨'}
    </motion.div>
  );
}
