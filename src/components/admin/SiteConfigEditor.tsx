'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Save,
  Loader2,
  Globe,
  Palette,
  Layout,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { toast } from 'sonner';

interface SiteConfig {
  id: string;
  siteName: string;
  siteDescription: string;
  logoUrl: string | null;
  primaryColor: string;
  layoutMode: string;
  language: string;
  maintenanceMode: boolean;
}

const LAYOUT_MODES = [
  { value: 'auto', label: '자동' },
  { value: 'kiosk-21', label: '키오스크 21인치' },
  { value: 'kiosk-32', label: '키오스크 32인치' },
  { value: 'desktop', label: '데스크톱' },
  { value: 'tablet', label: '태블릿' },
  { value: 'mobile', label: '모바일' },
];

const LANGUAGES = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
];

export default function SiteConfigEditor() {
  const { authenticatedFetch } = useAdminAuth();
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [siteName, setSiteName] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [layoutMode, setLayoutMode] = useState('auto');
  const [language, setLanguage] = useState('ko');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Maintenance toggle confirmation
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [pendingMaintenance, setPendingMaintenance] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config || data);
        setSiteName(data.config?.siteName || data.siteName || '');
        setSiteDescription(data.config?.siteDescription || data.siteDescription || '');
        setLogoUrl(data.config?.logoUrl || data.logoUrl || '');
        setPrimaryColor(data.config?.primaryColor || data.primaryColor || '');
        setLayoutMode(data.config?.layoutMode || data.layoutMode || 'auto');
        setLanguage(data.config?.language || data.language || 'ko');
        setMaintenanceMode(data.config?.maintenanceMode ?? data.maintenanceMode ?? false);
      }
    } catch {
      toast.error('사이트 설정을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        siteName,
        siteDescription,
        logoUrl: logoUrl || null,
        primaryColor,
        layoutMode,
        language,
        maintenanceMode,
      };

      const res = await authenticatedFetch('/api/admin/config', {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success('사이트 설정이 저장되었습니다.');
        fetchConfig();
      } else {
        toast.error('저장에 실패했습니다.');
      }
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleMaintenanceToggle = (checked: boolean) => {
    if (checked) {
      setPendingMaintenance(true);
      setMaintenanceDialogOpen(true);
    } else {
      setMaintenanceMode(false);
    }
  };

  const confirmMaintenance = () => {
    setMaintenanceMode(pendingMaintenance);
    setMaintenanceDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">사이트 설정</h2>
        <p className="text-muted-foreground">사이트 전역 설정 관리</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Live Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  실시간 미리보기
                </CardTitle>
                <CardDescription>변경 사항을 저장 전에 미리 확인할 수 있습니다</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {logoUrl && (
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0">
                      <img
                        src={logoUrl}
                        alt="로고"
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold" style={primaryColor ? { color: primaryColor } : undefined}>
                      {siteName || '사이트 이름'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {siteDescription || '사이트 설명'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Basic Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  기본 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>사이트 이름</Label>
                  <Input
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="AI 플랫폼"
                  />
                </div>
                <div className="space-y-2">
                  <Label>사이트 설명</Label>
                  <Textarea
                    value={siteDescription}
                    onChange={(e) => setSiteDescription(e.target.value)}
                    rows={3}
                    placeholder="AI와 대화하고, 이미지를 변환하고, 미래를 예측하세요."
                  />
                </div>
                <div className="space-y-2">
                  <Label>로고 URL</Label>
                  <Input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="/logo.png"
                  />
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      기본 색상
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                      />
                      {primaryColor && (
                        <div
                          className="w-10 h-10 rounded-lg border shrink-0"
                          style={{ backgroundColor: primaryColor }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      언어
                    </Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Layout Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="w-5 h-5 text-primary" />
                  레이아웃 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>레이아웃 모드</Label>
                  <Select value={layoutMode} onValueChange={setLayoutMode}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LAYOUT_MODES.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          {mode.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {layoutMode === 'auto' && '화면 크기에 따라 자동으로 레이아웃이 결정됩니다.'}
                    {layoutMode === 'kiosk-21' && '21인치 키오스크 화면에 최적화된 레이아웃입니다.'}
                    {layoutMode === 'kiosk-32' && '32인치 키오스크 화면에 최적화된 레이아웃입니다.'}
                    {layoutMode === 'desktop' && '데스크톱 화면에 최적화된 레이아웃입니다.'}
                    {layoutMode === 'tablet' && '태블릿 화면에 최적화된 레이아웃입니다.'}
                    {layoutMode === 'mobile' && '모바일 화면에 최적화된 레이아웃입니다.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Maintenance Mode */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <Card className={maintenanceMode ? 'border-destructive/50 bg-destructive/5' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className={`w-5 h-5 ${maintenanceMode ? 'text-destructive' : 'text-primary'}`} />
                  유지보수 모드
                </CardTitle>
                <CardDescription>
                  유지보수 모드를 활성화하면 일반 사용자가 사이트에 접근할 수 없습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="maintenance-mode"
                      checked={maintenanceMode}
                      onCheckedChange={handleMaintenanceToggle}
                    />
                    <Label htmlFor="maintenance-mode" className="font-medium">
                      {maintenanceMode ? '활성화됨' : '비활성화됨'}
                    </Label>
                  </div>
                  {maintenanceMode && (
                    <Badge variant="destructive">유지보수 중</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              설정 저장
            </Button>
          </div>
        </div>
      )}

      {/* Maintenance Mode Confirmation */}
      <AlertDialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              유지보수 모드 활성화
            </AlertDialogTitle>
            <AlertDialogDescription>
              유지보수 모드를 활성화하면 모든 일반 사용자가 사이트에 접근할 수 없습니다.
              정말 활성화하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMaintenance} className="bg-destructive text-white hover:bg-destructive/90">
              활성화
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
