'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Users,
  Shield,
  Clock,
  Settings,
  FlaskConical,
  AppWindow,
  KeyRound,
  BarChart3,
  Bell,
  Loader2,
  Menu,
  ListOrdered,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { detectKioskMode, isKioskMode, type KioskMode } from '@/lib/kiosk';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import ContentManager from './ContentManager';
import MenuManager from './MenuManager';
import UserManager from './UserManager';
import RoleManager from './RoleManager';
import AuditLogViewer from './AuditLogViewer';
import SiteConfigEditor from './SiteConfigEditor';
import MockDataManager from './MockDataManager';
import PwaIconManager from './PwaIconManager';
import SecurityPanel from './SecurityPanel';
import AnalyticsPanel from './AnalyticsPanel';
import PushPanel from './PushPanel';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ROLE_LABELS: Record<string, string> = {
  superadmin: '슈퍼관리자',
  admin: '관리자',
  editor: '편집자',
  viewer: '조회자',
};

const ROLE_COLORS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  superadmin: 'destructive',
  admin: 'default',
  editor: 'secondary',
  viewer: 'outline',
};

interface NavItem {
  value: string;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { value: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { value: 'content', label: '콘텐츠 관리', icon: FileText },
  { value: 'menus', label: '메뉴 관리', icon: ListOrdered },
  { value: 'users', label: '사용자 관리', icon: Users },
  { value: 'roles', label: '권한 관리', icon: Shield },
  { value: 'audit', label: '감사 로그', icon: Clock },
  { value: 'mock', label: '목업 데이터', icon: FlaskConical },
  { value: 'icons', label: 'PWA 아이콘', icon: AppWindow },
  { value: 'security', label: '내 계정 보안', icon: KeyRound },
  { value: 'analytics', label: '사용량 분석', icon: BarChart3 },
  { value: 'push', label: '푸시 알림', icon: Bell },
  { value: 'config', label: '사이트 설정', icon: Settings },
];

/* ------------------------------------------------------------------ */
/*  Content renderer                                                   */
/* ------------------------------------------------------------------ */

function AdminContent({ activeTab }: { activeTab: string }) {
  switch (activeTab) {
    case 'dashboard':
      return <AdminDashboard />;
    case 'content':
      return <ContentManager />;
    case 'menus':
      return <MenuManager />;
    case 'users':
      return <UserManager />;
    case 'roles':
      return <RoleManager />;
    case 'audit':
      return <AuditLogViewer />;
    case 'config':
      return <SiteConfigEditor />;
    case 'mock':
      return <MockDataManager />;
    case 'icons':
      return <PwaIconManager />;
    case 'security':
      return <SecurityPanel />;
    case 'analytics':
      return <AnalyticsPanel />;
    case 'push':
      return <PushPanel />;
    default:
      return <AdminDashboard />;
  }
}

/* ------------------------------------------------------------------ */
/*  Sidebar nav item (desktop / tablet)                                */
/* ------------------------------------------------------------------ */

function SidebarNavItem({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  const inner = (
    <button
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5
        text-sm font-medium transition-all duration-200
        hover:bg-accent hover:text-accent-foreground
        ${isActive
          ? 'bg-primary/10 text-primary hover:bg-primary/15'
          : 'text-muted-foreground'
        }`}
    >
      {/* Active indicator bar */}
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full
          transition-all duration-200
          ${isActive ? 'h-5 bg-primary' : 'h-0 bg-transparent'}`}
      />
      <Icon className={`shrink-0 ${collapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  );

  // In collapsed mode, wrap with Tooltip
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminPanel() {
  const { isAuthenticated, user, isLoading, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [kioskMode, setKioskMode] = useState<KioskMode>('none');

  // Tablet sidebar: collapsed by default, expanded on hover
  const [tabletExpanded, setTabletExpanded] = useState(false);

  /* ---- Kiosk detection (단일 기준 lib/kiosk) ---- */
  useEffect(() => {
    const checkKiosk = () => {
      setKioskMode(detectKioskMode(window.innerWidth));
    };
    checkKiosk();
    window.addEventListener('resize', checkKiosk);
    return () => window.removeEventListener('resize', checkKiosk);
  }, []);

  // 키오스크(터치) 모드에서는 hover 확장 비활성화 — 오동작 방지
  const kioskActive = isKioskMode(kioskMode);

  const handleLogout = useCallback(() => {
    logout();
    toast.success('로그아웃되었습니다.');
  }, [logout]);

  const handleNav = useCallback((value: string) => {
    setActiveTab(value);
    setMobileOpen(false);
  }, []);

  /* ---- Loading / Auth guards ---- */
  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  const kioskClass = kioskMode === 'kiosk-32' ? 'text-lg kiosk-32' : kioskMode === 'kiosk-21' ? 'text-base kiosk-21' : '';
  const kioskContentClass = kioskMode === 'kiosk-32' ? 'p-8' : kioskMode === 'kiosk-21' ? 'p-6' : 'p-4 sm:p-6';
  const userInitials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD';

  /* ---- Shared sidebar content (used in desktop/tablet sidebar & mobile sheet) ---- */
  const sidebarNavContent = (collapsed: boolean) => (
    <nav className="flex flex-col gap-1 px-2">
      {NAV_ITEMS.map((item) => (
        <SidebarNavItem
          key={item.value}
          item={item}
          isActive={activeTab === item.value}
          collapsed={collapsed}
          onClick={() => handleNav(item.value)}
        />
      ))}
    </nav>
  );

  const sidebarUserInfo = (showName: boolean) => (
    <div className="flex items-center gap-3 px-3 py-3">
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
          {userInitials}
        </AvatarFallback>
      </Avatar>
      {showName && (
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate">{user?.name}</span>
          <Badge variant={ROLE_COLORS[user?.role || ''] || 'outline'} className="text-[10px] w-fit mt-0.5">
            {ROLE_LABELS[user?.role || ''] || user?.role}
          </Badge>
        </div>
      )}
    </div>
  );

  return (
    <div className={`h-full flex bg-background ${kioskClass}`}>
      {/* ============================================================ */}
      {/*  DESKTOP sidebar (lg+) — always visible, full width w-56      */}
      {/* ============================================================ */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r bg-muted/20">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-4 border-b">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">관리자</span>
          {kioskMode !== 'none' && (
            <Badge variant="outline" className="text-[10px] ml-auto">
              {kioskMode === 'kiosk-21' ? '21"' : '32"'}
            </Badge>
          )}
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-3">
          {sidebarNavContent(false)}
        </div>

        {/* User info + logout */}
        <Separator />
        <div className="shrink-0">
          {sidebarUserInfo(true)}
          <div className="px-3 pb-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/*  TABLET sidebar (md – lg) — icon-only, expand on hover       */}
      {/* ============================================================ */}
      <aside
        className="hidden md:flex lg:hidden flex-col shrink-0 border-r bg-muted/20 transition-all duration-300 ease-in-out"
        style={{ width: tabletExpanded && !kioskActive ? 224 : 56 }}
        onMouseEnter={() => { if (!kioskActive) setTabletExpanded(true); }}
        onMouseLeave={() => setTabletExpanded(false)}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-4 border-b overflow-hidden">
          <Shield className="shrink-0 w-5 h-5 text-primary" />
          <span
            className={`font-semibold text-sm whitespace-nowrap transition-all duration-300 ${
              tabletExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
            }`}
          >
            관리자
          </span>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-3">
          {sidebarNavContent(!tabletExpanded)}
        </div>

        {/* User info */}
        <Separator />
        <div className="shrink-0 overflow-hidden">
          {sidebarUserInfo(tabletExpanded)}
          {tabletExpanded && (
            <div className="px-3 pb-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </Button>
            </div>
          )}
          {!tabletExpanded && (
            <div className="px-2 pb-3 flex justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  로그아웃
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>

      {/* ============================================================ */}
      {/*  MAIN content area                                           */}
      {/* ============================================================ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar (below md) */}
        <div className="flex md:hidden items-center gap-2 border-b px-3 py-2 bg-muted/20 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setMobileOpen(true)}
            aria-label="메뉴 열기"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">관리자</span>
          <span className="ml-auto text-xs text-muted-foreground truncate">
            {NAV_ITEMS.find((i) => i.value === activeTab)?.label}
          </span>
          {kioskMode !== 'none' && (
            <Badge variant="outline" className="text-[10px]">
              {kioskMode === 'kiosk-21' ? '21"' : '32"'}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto ${kioskContentClass}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <AdminContent activeTab={activeTab} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ============================================================ */}
      {/*  MOBILE sheet drawer                                         */}
      {/* ============================================================ */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Shield className="w-5 h-5 text-primary" />
              관리자 패널
            </SheetTitle>
            <SheetDescription className="sr-only">
              관리자 탐색 메뉴
            </SheetDescription>
          </SheetHeader>

          {/* Nav */}
          <div className="flex-1 overflow-y-auto py-3">
            {sidebarNavContent(false)}
          </div>

          {/* User info + logout */}
          <Separator />
          <div className="shrink-0 p-3">
            {sidebarUserInfo(true)}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive mt-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
