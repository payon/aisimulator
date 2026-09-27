'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Smartphone,
  Monitor,
  Download,
  RefreshCw,
  Trash2,
  Bell,
  HardDrive,
  Shield,
  Info,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { usePWA } from '@/hooks/use-pwa';

// === PWA 설정 패널 (설정 탭 내부에 임베드) ===
export function PWASettingsPanel() {
  const {
    isInstalled,
    isInstallable,
    isStandalone,
    isOnline,
    isUpdateAvailable,
    isServiceWorkerReady,
    installApp,
    applyUpdate,
    getCacheSize,
    clearCache,
    unsubscribeFromPush,
    getPushSubscription,
  } = usePWA();

  const [cacheSize, setCacheSize] = useState<number>(0);
  const [installing, setInstalling] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [showPermissionInfo, setShowPermissionInfo] = useState(false);

  // 캐시 크기 조회
  useEffect(() => {
    if (isServiceWorkerReady) {
      getCacheSize().then(setCacheSize);
    }
  }, [isServiceWorkerReady, getCacheSize]);

  // 푸시 구독 상태 확인
  useEffect(() => {
    getPushSubscription().then((sub) => {
      setPushEnabled(!!sub);
    });
  }, [getPushSubscription]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleInstall = async () => {
    setInstalling(true);
    await installApp();
    setInstalling(false);
  };

  const handleUpdate = async () => {
    setUpdating(true);
    applyUpdate();
  };

  const handleClearCache = async () => {
    setClearing(true);
    await clearCache();
    setCacheSize(0);
    setClearing(false);
  };

  const handlePushToggle = async () => {
    if (pushEnabled) {
      const success = await unsubscribeFromPush();
      if (success) setPushEnabled(false);
    } else {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushEnabled(true);
      }
    }
  };

  const cacheUsagePercent = Math.min(100, (cacheSize / (50 * 1024 * 1024)) * 100);

  return (
    <div className="space-y-4">
      {/* PWA 상태 요약 */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">PWA 상태</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            {isInstalled || isStandalone ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <X className="w-4 h-4 text-muted-foreground" />
            )}
            <div>
              <p className="text-xs font-medium">설치 상태</p>
              <p className="text-[10px] text-muted-foreground">
                {isStandalone ? '앱 모드 실행 중' : isInstalled ? '설치됨' : '미설치'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            {isOnline ? (
              <Smartphone className="w-4 h-4 text-emerald-500" />
            ) : (
              <X className="w-4 h-4 text-destructive" />
            )}
            <div>
              <p className="text-xs font-medium">네트워크</p>
              <p className="text-[10px] text-muted-foreground">
                {isOnline ? '온라인' : '오프라인'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            {isServiceWorkerReady ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
            )}
            <div>
              <p className="text-xs font-medium">서비스 워커</p>
              <p className="text-[10px] text-muted-foreground">
                {isServiceWorkerReady ? '활성' : '등록 중...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            {isStandalone ? (
              <Smartphone className="w-4 h-4 text-primary" />
            ) : (
              <Monitor className="w-4 h-4 text-muted-foreground" />
            )}
            <div>
              <p className="text-xs font-medium">실행 모드</p>
              <p className="text-[10px] text-muted-foreground">
                {isStandalone ? '독립 실행' : '브라우저'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 앱 설치 */}
      {!isInstalled && !isStandalone && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">앱 설치</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            홈 화면에 추가하면 앱처럼 빠르게 실행할 수 있습니다. 주소창 없이 전체 화면으로 사용됩니다.
          </p>
          {isInstallable ? (
            <Button
              onClick={handleInstall}
              disabled={installing}
              className="w-full gap-2"
            >
              <Download className="w-4 h-4" />
              {installing ? '설치 중...' : '홈 화면에 추가'}
            </Button>
          ) : (
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <p className="font-medium mb-1">설치 방법 안내</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Chrome:</strong> 주소창 오른쪽 메뉴 → 앱 설치</li>
                <li><strong>Safari (iOS):</strong> 공유 버튼 → 홈 화면에 추가</li>
                <li><strong>Samsung Internet:</strong> 주소창 메뉴 → 홈 화면에 추가</li>
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* 업데이트 */}
      {isUpdateAvailable && (
        <Card className="p-4 border-primary/30">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">업데이트 사용 가능</h3>
            <Badge variant="secondary" className="text-[10px]">NEW</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            새 버전이 감지되었습니다. 업데이트하면 최신 기능과 버그 수정이 적용됩니다.
          </p>
          <Button
            onClick={handleUpdate}
            disabled={updating}
            className="w-full gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
            {updating ? '업데이트 중...' : '업데이트 적용'}
          </Button>
        </Card>
      )}

      {/* 캐시 관리 */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">캐시 관리</h3>
        </div>
        
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">사용 중</span>
            <span className="font-medium">{formatBytes(cacheSize)}</span>
          </div>
          <Progress value={cacheUsagePercent} className="h-2" />
          <p className="text-[10px] text-muted-foreground">
            오프라인 사용을 위해 페이지와 리소스를 캐시에 저장합니다
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleClearCache}
          disabled={clearing}
          className="w-full gap-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {clearing ? '삭제 중...' : '캐시 전체 삭제'}
        </Button>
      </Card>

      {/* 알림 설정 */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">알림 설정</h3>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium">푸시 알림</p>
            <p className="text-[10px] text-muted-foreground">
              새로운 소식과 업데이트를 받습니다
            </p>
          </div>
          <Switch
            checked={pushEnabled}
            onCheckedChange={handlePushToggle}
          />
        </div>

        <button
          onClick={() => setShowPermissionInfo(!showPermissionInfo)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mt-2"
        >
          <Info className="w-3 h-3" />
          알림 권한 안내
        </button>

        {showPermissionInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-2 mt-2 rounded-lg bg-muted/50 text-[10px] text-muted-foreground space-y-1">
              <p>• 브라우저 설정에서 알림 권한을 허용해야 합니다</p>
              <p>• iOS Safari는 푸시 알림을 지원하지 않습니다</p>
              <p>• Android Chrome은 완전한 푸시 알림을 지원합니다</p>
            </div>
          </motion.div>
        )}
      </Card>

      {/* TWA 정보 */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">TWA (Trusted Web Activity)</h3>
          <Badge variant="outline" className="text-[10px]">준비됨</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          이 앱은 TWA 호환 PWA로 설정되어 있어, Android 앱으로 패키징할 수 있습니다.
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px]">Web App Manifest 호환</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px]">Service Worker 등록</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px]">HTTPS 필요 (Digital Asset Links)</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px]">standalone display 모드</span>
          </div>
        </div>

        <Separator className="my-3" />

        <div className="p-2 rounded-lg bg-muted/50">
          <p className="text-[10px] text-muted-foreground mb-1">
            <strong>TWA 빌드 옵션:</strong>
          </p>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[9px] gap-1">
              <ExternalLink className="w-2.5 h-2.5" />
              Bubblewrap (CLI)
            </Badge>
            <Badge variant="secondary" className="text-[9px] gap-1">
              <ExternalLink className="w-2.5 h-2.5" />
              Tauri (데스크톱+모바일)
            </Badge>
            <Badge variant="secondary" className="text-[9px] gap-1">
              <ExternalLink className="w-2.5 h-2.5" />
              React Native (WebView)
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
