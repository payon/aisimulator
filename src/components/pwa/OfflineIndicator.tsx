'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/use-pwa';
import { useState } from 'react';

// === 오프라인 인디케이터 ===
export function OfflineIndicator() {
  const { isOnline } = usePWA();

  return (
    <>
      {/* 오프라인 상태 표시 */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 right-0 z-[60] bg-destructive text-white"
          >
            <div className="flex items-center justify-center gap-2 px-4 py-2">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">오프라인 - 인터넷에 연결되면 자동으로 복구됩니다</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// === 온라인 복구 알림 ===
export function OnlineRecoveryBanner({ show, onDismiss }: { show: boolean; onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[60] bg-emerald-600 text-white"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2">
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">온라인 복구됨 - 데이터가 자동으로 동기화됩니다</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// === 업데이트 알림 ===
export function UpdateNotifier() {
  const { isUpdateAvailable, applyUpdate } = usePWA();
  const [updating, setUpdating] = useState(false);

  const handleUpdate = () => {
    setUpdating(true);
    applyUpdate();
  };

  return (
    <AnimatePresence>
      {isUpdateAvailable && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-card border border-primary/30 rounded-xl shadow-lg p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <RefreshCw className={`w-4 h-4 text-primary ${updating ? 'animate-spin' : ''}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">새 버전 사용 가능</p>
              <p className="text-xs text-muted-foreground">업데이트하면 최신 기능을 사용할 수 있습니다</p>
            </div>
            <Button
              size="sm"
              onClick={handleUpdate}
              disabled={updating}
              className="h-8 px-3 text-xs shrink-0 ml-2"
            >
              {updating ? '업데이트 중...' : '업데이트'}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// === 오프라인 폴백 인디케이터 (컴포넌트 내부용) ===
export function OfflineFallback({ feature }: { feature: string }) {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800"
    >
      <CloudOff className="w-4 h-4 shrink-0" />
      <span className="text-sm">{feature} 기능은 오프라인에서 제한됩니다</span>
    </motion.div>
  );
}
