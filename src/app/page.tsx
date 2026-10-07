'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TABS, type TabId } from '@/types';
import { useSpeechSynthesis } from '@/hooks/use-voice';
import { useCmsContent, setCmsLanguage } from '@/hooks/use-cms-content';
import { useNavItems } from '@/hooks/use-nav-items';
import { useSettingsStore } from '@/stores/index';
import { useClientValue } from '@/hooks/use-hydrated';
import { detectKioskMode, isKioskMode, KIOSK_IDLE_RESET_MS } from '@/lib/kiosk';

import ChatPanel from '@/components/features/ChatPanel';
import ImagePanel from '@/components/features/ImagePanel';
import FutureMePanel from '@/components/features/FutureMePanel';
import QuizPanel from '@/components/features/QuizPanel';
import GuideBasicsPanel from '@/components/features/GuideBasicsPanel';
import GuideServicesPanel from '@/components/features/GuideServicesPanel';
import GuideAppPanel from '@/components/features/GuideAppPanel';
import PracticePanel from '@/components/features/PracticePanel';
import SettingsPanel from '@/components/features/SettingsPanel';
import HomePage from '@/components/features/HomePage';
import AccessibilityPanel from '@/components/features/AccessibilityPanel';
import NotificationSystem from '@/components/features/NotificationSystem';
import SeniorOnboarding from '@/components/features/SeniorOnboarding';
import SeniorGuideTour, { GuideTourHelpButton } from '@/components/features/SeniorGuideTour';

// PWA 컴포넌트
import { PWAInstallBanner, PWAStatusBadge } from '@/components/pwa/PWAInstallBanner';
import { OfflineIndicator, UpdateNotifier } from '@/components/pwa/OfflineIndicator';
import { NotificationPermissionBanner } from '@/components/pwa/PWANotificationManager';

import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';

import {
  MessageSquare,
  MessagesSquare,
  ImageIcon,
  Sparkles,
  GraduationCap,
  Settings,
  Home,
  BookOpen,
  Bot,
  Smartphone,
  Volume2,
  VolumeX,
  X,
  FlaskConical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const TAB_ICONS: Record<TabId, React.ReactNode> = {
  home: <Home className="w-5 h-5" />,
  chat: <MessageSquare className="w-5 h-5" />,
  guide: <BookOpen className="w-5 h-5" />,
  services: <Bot className="w-5 h-5" />,
  appguide: <Smartphone className="w-5 h-5" />,
  practice: <MessagesSquare className="w-5 h-5" />,
  image: <ImageIcon className="w-5 h-5" />,
  future: <Sparkles className="w-5 h-5" />,
  quiz: <GraduationCap className="w-5 h-5" />,
  settings: <Settings className="w-5 h-5" />,
};

// 키오스크 모드 감지 + Mock 모드 상태 + 사이트 언어
function useSiteConfig() {
  const [mode, setMode] = useState<'auto' | 'kiosk-21' | 'kiosk-32' | 'desktop' | 'tablet' | 'mobile'>('auto');
  const [mockMode, setMockMode] = useState(false);
  const [siteLanguage, setSiteLanguage] = useState('ko');

  useEffect(() => {
    let cancelled = false;
    // 사용자 지정 언어가 없을 때만 사이트 기본값으로 CMS 언어 동기화
    const applySiteLang = (lang: string) => {
      if (!useSettingsStore.getState().langCustomized) {
        setCmsLanguage(lang);
      }
    };
    const updateMode = () => {
      // 단일 기준 lib/kiosk (21" 1080 / 32" 1920)
      const detected = detectKioskMode(window.innerWidth);
      if (!cancelled) {
        if (detected === 'kiosk-32') setMode('kiosk-32');
        else if (detected === 'kiosk-21') setMode('kiosk-21');
        else setMode('auto');
      }
    };
    const detect = async () => {
      let forceMode: string | null = null;
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            if (data.data.mockMode !== undefined && !cancelled) setMockMode(data.data.mockMode);
            if (data.data.language) {
              if (!cancelled) setSiteLanguage(data.data.language);
              applySiteLang(data.data.language);
            } else {
              applySiteLang('ko');
            }
            if (data.data.layoutMode && data.data.layoutMode !== 'auto') {
              forceMode = data.data.layoutMode;
            }
          }
        }
      } catch { /* ignore */ }
      if (cancelled) return;
      if (forceMode) {
        setMode(forceMode as typeof mode);
      } else {
        updateMode();
        window.addEventListener('resize', updateMode);
      }
    };
    detect();
    return () => {
      cancelled = true;
      window.removeEventListener('resize', updateMode);
    };
  }, []);

  return { mode, mockMode, siteLanguage, setMockMode };
}

// 폰트 크기 클래스 매핑
const FONT_SIZE_CLASSES: Record<string, string> = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
  xlarge: 'text-xl',
};

// === 앱 사이드바 컴포넌트 ===
function AppSidebar({ activeTab, setActiveTab }: { activeTab: TabId; setActiveTab: (tab: TabId) => void }) {
  const { getContent } = useCmsContent();
  const { voiceEnabled } = useSettingsStore();
  // 관리자 메뉴 관리(nav.order/nav.hidden/nav.<id>.label) 반영 — 저장 시 즉시 적용
  const navItems = useNavItems();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h1 className="font-bold text-sm tracking-tight">{getContent('global.siteName', 'AI 플랫폼')}</h1>
            <p className="text-[10px] text-muted-foreground leading-none">
              {getContent('global.providerBadge', 'OpenAI · Gemini · Grok · Claude')}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ tab, label }) => (
                <SidebarMenuItem key={tab.id}>
                  <SidebarMenuButton
                    isActive={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    tooltip={label}
                    className="h-11 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10"
                    data-guide={`nav-${tab.id}`}
                  >
                    {TAB_ICONS[tab.id]}
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="group-data-[collapsible=icon]:hidden space-y-2">
          {voiceEnabled && (
            <div className="flex items-center gap-2 text-xs text-primary">
              <Volume2 className="w-3.5 h-3.5" />
              <span>음성 읽기 켜짐</span>
            </div>
          )}
          <Separator />
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            {getContent('global.footerText', 'Powered by AI')}
          </p>
        </div>
        {/* 축소 상태일 때 음성 아이콘만 표시 */}
        {voiceEnabled && (
          <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center">
            <Volume2 className="w-4 h-4 text-primary" />
          </div>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

// === 메인 앱 ===
export default function MainApp() {
  // PWA 바로가기 URL 파라미터 처리 (?tab=chat 등)
  // 항상 서버와 동일한 초기값으로 렌더링하여 hydration mismatch 방지
  const [activeTab, setActiveTab] = useState<TabId>('home');

  // hydration 후 URL 파라미터 확인 (side effect: history.replaceState)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      window.history.replaceState({}, '', '/');
      setActiveTab(tabParam as TabId); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, []);
  const { mode: kioskMode, mockMode, siteLanguage } = useSiteConfig();
  const { speak, stop, status: ttsStatus, warmUp, koreanVoiceFound, voiceName, engineReady, speakServer } = useSpeechSynthesis();
  const { getContent } = useCmsContent();
  const { fontSize, highContrast, voiceEnabled, touchTargetLarge, setVoiceEnabled } = useSettingsStore();

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (voiceEnabled) stop();
  };

  // 탭 전환 시 TTS 재생 중지 (다른 메뉴로 이동하면 음성이 꺼져야 함)
  const prevTabRef = useRef<TabId>(activeTab);
  useEffect(() => {
    if ((prevTabRef.current === 'chat' || prevTabRef.current === 'practice') && activeTab !== prevTabRef.current) {
      // 채팅/체험에서 다른 탭으로 전환 → TTS 즉시 중지
      stop();
    }
    if (activeTab === 'chat') {
      // 채팅 탭으로 돌아오면 음성 재생 안 함 (사용자가 새 메시지를 보낼 때만)
    }
    prevTabRef.current = activeTab;
  }, [activeTab, stop]);

  // 키오스크 모드별 스타일 조정 (단일 기준)
  const isKiosk = isKioskMode(kioskMode as 'none' | 'kiosk-21' | 'kiosk-32');
  const kioskClass = kioskMode === 'kiosk-32' ? 'kiosk-32' : kioskMode === 'kiosk-21' ? 'kiosk-21' : '';

  // 전시장 무조작 복귀: 5분 무조작 시 홈 + TTS 중지 (키오스크만)
  useEffect(() => {
    if (!isKiosk) return;
    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        stop();
        setActiveTab('home');
      }, KIOSK_IDLE_RESET_MS);
    };
    const events = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [isKiosk, stop]);

  // 키오스크 원격 명령 수신 (kiosk.command 폴링 — CMS 15초 주기와 함께 수렴)
  // 렌더 캐스케이드 방지를 위해 명령 실행은 microtask로 위임
  const processedCmdRef = useRef<string | null>(null);
  useEffect(() => {
    const cmdRaw = getContent('kiosk.command', '');
    if (!cmdRaw) return;
    try {
      const cmd = JSON.parse(cmdRaw);
      if (!cmd.id || cmd.id === processedCmdRef.current) return;
      processedCmdRef.current = cmd.id;
      queueMicrotask(() => {
        if (cmd.action === 'reload') {
          window.location.reload();
        } else if (cmd.action === 'home') {
          stop();
          setActiveTab('home');
        }
      });
    } catch { /* invalid JSON 무시 */ }
  });

  // 키오스크 운영시간 외 안내 (kiosk.hours {open:"09:00", close:"18:00"})
  const hoursRaw = getContent('kiosk.hours', '');
  let outsideHours = false;
  if (hoursRaw) {
    try {
      const h = JSON.parse(hoursRaw);
      if (h.open || h.close) {
        const now = new Date();
        const cur = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if ((h.open && cur < h.open) || (h.close && cur >= h.close)) outsideHours = true;
      }
    } catch { /* ignore */ }
  }

  const siteName = getContent('global.siteName', 'AI 플랫폼');

  // 폰트 스케일 클래스
  const fontScaleClass = FONT_SIZE_CLASSES[fontSize] || 'text-lg';
  // 고대비 모드 클래스
  const highContrastClass = highContrast ? 'high-contrast' : '';
  // 큰 터치 영역 클래스
  const touchTargetClass = touchTargetLarge ? 'touch-large' : '';

  // 시뮬레이션 배너 표시 여부 (세션당 1회)
  // useClientValue로 hydration-safe하게 sessionStorage 읽기
  const mockBannerDismissed = useClientValue(
    false,
    () => !!sessionStorage.getItem('mockBannerDismissed'),
  );
  const [showMockBanner, setShowMockBanner] = useState(true);
  // localStorage에서 이미 dismissed면 렌더에서 바로 반영
  const effectiveShowMockBanner = showMockBanner && !mockBannerDismissed;

  const dismissMockBanner = () => {
    setShowMockBanner(false);
    sessionStorage.setItem('mockBannerDismissed', 'true');
  };



  return (
    <div className={`h-screen flex flex-col bg-background ${fontScaleClass} ${highContrastClass} ${touchTargetClass} ${kioskClass}`}>
      {/* PWA: 오프라인/온라인 상태 표시 (키오스크 전시장에서는 상시 표시만, 설치 배너는 억제) */}
      <OfflineIndicator />

      {/* PWA: 알림 권한 요청 (키오스크에서는 억제 — 시니어 혼란 방지) */}
      {!isKiosk && <NotificationPermissionBanner />}

      {/* 온보딩 가이드 (최초 1회) */}
      <SeniorOnboarding />

      {/* 단계별 사용법 안내 (헤더 도움말 버튼으로 시작, 오버레이만 렌더) */}
      <SeniorGuideTour />

      {/* ===== 사용자 모드 (사이드바 레이아웃) ===== */}
      <SidebarProvider defaultOpen={true} className="flex-1 min-h-0">
          <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

          <SidebarInset>
            {/* 시뮬레이션 모드 상단 배너 */}
            {mockMode && effectiveShowMockBanner && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="shrink-0 bg-amber-100 border-b border-amber-300"
              >
                <div className="flex items-center justify-center gap-2 px-4 py-2">
                  <FlaskConical className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800 font-medium">
                    시뮬레이션 모드 활성화됨 - AI 없이도 동작을 시연합니다
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={dismissMockBanner}
                    className="h-6 w-6 text-amber-600 hover:text-amber-800 hover:bg-amber-200 ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* 상단 헤더 (사이드바 트리거 + 타이틀 + 우측 아이콘) */}
            <header className="flex items-center justify-between px-3 sm:px-4 h-14 sm:h-16 border-b bg-card shrink-0 sticky top-0 z-30">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* 사이드바 토글 버튼 */}
                <SidebarTrigger className="h-9 w-9" data-guide="sidebar-toggle" />

                <Separator orientation="vertical" className="h-6 hidden sm:block" />

                <div className="hidden sm:block">
                  <h1 className="font-bold text-base sm:text-lg tracking-tight">{siteName}</h1>
                </div>
              </div>

              {/* 우측 아이콘 그룹 */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* 음성 토글 */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleVoice}
                  className={`h-10 w-10 ${voiceEnabled ? 'text-primary' : 'text-muted-foreground'}`}
                  title={voiceEnabled ? '음성 끄기' : '음성 켜기'}
                  data-guide="voice-toggle"
                >
                  {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </Button>

                {/* 알림 */}
                <NotificationSystem />

                {/* 접근성 설정 */}
                <div data-guide="accessibility">
                  <AccessibilityPanel
                    ttsStatus={ttsStatus}
                    ttsVoiceName={voiceName}
                    ttsKoreanVoiceFound={koreanVoiceFound}
                    onWarmUp={warmUp}
                    onTestSpeak={() => speak('안녕하세요, 음성 테스트입니다.', 0.8)}
                  />
                </div>

                {/* 도움말 (사용법 안내) — 관리자 버튼 자리에 배치 */}
                <GuideTourHelpButton />

                {/* Mock/시뮬레이션 모드 배지 */}
                {mockMode && (
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-300">
                    시뮬레이션
                  </Badge>
                )}
                {isKiosk && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                    {kioskMode === 'kiosk-32' ? '32"' : '21"'}
                  </Badge>
                )}
              </div>
            </header>

            {/* 메인 콘텐츠 */}
            <section className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {activeTab === 'home' && <HomePage onNavigate={setActiveTab} />}
                  {activeTab === 'chat' && (
                    <ChatPanel
                      voiceEnabled={voiceEnabled}
                      onToggleVoice={toggleVoice}
                      speak={speak}
                      stop={stop}
                      engineReady={engineReady}
                      speakServer={speakServer}
                    />
                  )}
                  {activeTab === 'guide' && <GuideBasicsPanel />}
                  {activeTab === 'services' && <GuideServicesPanel />}
                  {activeTab === 'appguide' && <GuideAppPanel />}
                  {activeTab === 'practice' && (
                    <PracticePanel
                      voiceEnabled={voiceEnabled}
                      onToggleVoice={toggleVoice}
                      speak={speak}
                      stop={stop}
                      engineReady={engineReady}
                      speakServer={speakServer}
                    />
                  )}
                  {activeTab === 'image' && <ImagePanel />}
                  {activeTab === 'future' && <FutureMePanel />}
                  {activeTab === 'quiz' && <QuizPanel />}
                  {activeTab === 'settings' && <SettingsPanel />}
                </motion.div>
              </AnimatePresence>
            </section>

            {/* 하단 푸터 - 모바일에서만 노출 */}
            <footer className="border-t bg-card px-4 py-2 text-center shrink-0 sm:hidden">
              <p className="text-[10px] text-muted-foreground">{getContent('global.footerText', 'Powered by AI')}</p>
            </footer>
          </SidebarInset>
        </SidebarProvider>

      {/* PWA: 설치 프롬프트/업데이트/배지 (키오스크 전시장에서는 억제) */}
      {!isKiosk && <PWAInstallBanner />}

      {/* PWA: 업데이트 알림 */}
      {!isKiosk && <UpdateNotifier />}

      {/* PWA: 앱 모드 배지 */}
      {!isKiosk && <PWAStatusBadge className="fixed top-16 right-4 z-40" />}

      {/* 키오스크 운영시간 외 안내 */}
      {isKiosk && outsideHours && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900 text-white p-8 text-center">
          <div>
            <p className="text-3xl font-bold mb-4">운영 시간이 아닙니다</p>
            <p className="text-lg text-slate-300">운영 시간에 다시 이용해 주세요.</p>
          </div>
        </div>
      )}
    </div>
  );
}
