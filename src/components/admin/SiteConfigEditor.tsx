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
  Upload,
  CheckCircle2,
  Trash2,
  Image as ImageIcon,
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
import KioskControl from './KioskControl';
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

  // 화면별 로고 (업로드 후 규격 자동 조정)
  interface LogoItem {
    file: string;
    width: number;
    height: number;
    label: string;
    targets: string;
    url: string;
    exists: boolean;
    actualWidth: number | null;
    actualHeight: number | null;
    bytes: number;
    match: boolean;
  }
  const [logoItems, setLogoItems] = useState<LogoItem[]>([]);
  const [logoLoading, setLogoLoading] = useState(true);
  const [logoUploading, setLogoUploading] = useState<string | null>(null);

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

  const fetchLogos = useCallback(async () => {
    setLogoLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/logo');
      if (res.ok) {
        const data = await res.json();
        setLogoItems(data.items || []);
      } else if (res.status !== 401) {
        toast.error('로고 목록을 불러오지 못했습니다.');
      }
    } catch {
      toast.error('로고 목록을 불러오지 못했습니다.');
    } finally {
      setLogoLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    fetchLogos();
  }, [fetchLogos]);

  const handleLogoUpload = async (fileName: string, file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('PNG, JPG, WebP 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하여야 합니다.');
      return;
    }
    setLogoUploading(fileName);
    try {
      const form = new FormData();
      form.append('name', fileName);
      form.append('file', file);
      const res = await authenticatedFetch('/api/admin/logo', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`${data.width}x${data.height} 크기로 자동 조정되어 저장되었습니다.`);
        fetchLogos();
      } else if (res.status !== 401) {
        toast.error(data.error || '업로드에 실패했습니다.');
      }
    } catch {
      toast.error('업로드 중 오류가 발생했습니다.');
    } finally {
      setLogoUploading(null);
    }
  };

  const handleLogoDelete = async (fileName: string) => {
    try {
      const res = await authenticatedFetch(`/api/admin/logo?name=${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('로고가 삭제되었습니다.');
        fetchLogos();
      } else if (res.status !== 401) {
        toast.error(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

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
                    placeholder="/uploads/logo/logo-desktop.png"
                  />
                  <p className="text-xs text-muted-foreground">
                    아래 화면별 로고에서 파일을 업로드한 뒤 [로고로 사용]을 누르면 자동 입력됩니다. 외부 URL도 직접 입력할 수 있습니다.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>화면별 로고 업로드 (자동 크기 조정)</Label>
                  {logoLoading ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      로고 목록을 불러오는 중...
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {logoItems.map((item) => (
                        <div
                          key={item.file}
                          className={`flex items-center gap-3 border rounded-lg p-3 ${logoUrl === item.url ? 'border-primary bg-primary/5' : ''}`}
                        >
                          <div className="w-14 h-14 rounded-lg border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                            {item.exists ? (
                              <img
                                src={`${item.url}?t=${item.bytes}`}
                                alt={item.label}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{item.targets}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">
                                규격 {item.width}x{item.height}
                              </Badge>
                              {item.exists ? (
                                <Badge variant={item.match ? 'default' : 'secondary'} className="text-[10px]">
                                  {item.match ? (
                                    <span className="inline-flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> 등록됨
                                    </span>
                                  ) : (
                                    `실제 ${item.actualWidth}x{item.actualHeight}`
                                  )}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">미등록</Badge>
                              )}
                              {logoUrl === item.url && (
                                <Badge variant="default" className="text-[10px]">사용 중</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <label className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border cursor-pointer hover:bg-muted">
                              {logoUploading === item.file ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5" />
                              )}
                              업로드
                              <Input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                disabled={logoUploading !== null}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleLogoUpload(item.file, f);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            {item.exists && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-7 px-2"
                                  onClick={() => {
                                    setLogoUrl(item.url);
                                    toast.success(`${item.label}이(가) 로고로 설정되었습니다. 저장 버튼을 눌러 반영하세요.`);
                                  }}
                                >
                                  로고로 사용
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-7 px-2 text-destructive hover:text-destructive"
                                  onClick={() => handleLogoDelete(item.file)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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

          {/* Kiosk Remote Control */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <KioskControl />
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
