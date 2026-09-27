'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AppWindow,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { PWA_ICON_GROUPS, type PwaIconGroup } from '@/lib/pwa-icons';
import { toast } from 'sonner';

interface PwaIconItem {
  file: string;
  width: number;
  height: number;
  group: PwaIconGroup;
  label: string;
  targets: string;
  url: string;
  exists: boolean;
  actualWidth: number | null;
  actualHeight: number | null;
  bytes: number;
  match: boolean;
}

export default function PwaIconManager() {
  const { authenticatedFetch } = useAdminAuth();
  const [items, setItems] = useState<PwaIconItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PwaIconItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/icons');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      } else if (res.status !== 401) {
        toast.error('PWA 아이콘 목록을 불러오지 못했습니다.');
      }
    } catch {
      toast.error('PWA 아이콘 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleUpload = async (fileName: string, file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('PNG, JPG, WebP 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하여야 합니다.');
      return;
    }
    setUploading(fileName);
    try {
      const form = new FormData();
      form.append('name', fileName);
      form.append('file', file);
      const res = await authenticatedFetch('/api/admin/icons', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`${fileName} 교체 완료 (${data.width}x${data.height} 자동 조정)`);
        fetchItems();
      } else if (res.status !== 401) {
        toast.error(data.error || '업로드에 실패했습니다.');
      }
    } catch {
      toast.error('업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await authenticatedFetch(`/api/admin/icons?name=${encodeURIComponent(deleteTarget.file)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('아이콘이 삭제되었습니다.');
        setDeleteTarget(null);
        fetchItems();
      } else if (res.status !== 401) {
        toast.error(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">PWA 아이콘을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <AppWindow className="w-6 h-6 text-primary" />
          PWA 아이콘 관리
        </h2>
        <p className="text-muted-foreground">
          업로드한 이미지는 해당 화면 규격에 맞게 자동 리사이즈되어 저장됩니다.
          교체 후에는 기기에서 앱을 재설치해야 반영됩니다.
        </p>
      </div>

      {PWA_ICON_GROUPS.map((group) => {
        const groupItems = items.filter((i) => i.group === group.key);
        if (groupItems.length === 0) return null;
        return (
          <div key={group.key} className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold">{group.label}</h3>
              <p className="text-sm text-muted-foreground">{group.desc}</p>
            </div>
            <div className="grid gap-3">
              {groupItems.map((item, i) => (
                <motion.div
                  key={item.file}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex items-center gap-3 sm:w-64 shrink-0">
                          <div className="w-16 h-16 rounded-lg border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                            {item.exists ? (
                              <img
                                src={`${item.url}?t=${item.bytes}`}
                                alt={item.label}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <AlertTriangle className="w-6 h-6 text-destructive" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{item.label}</p>
                            <code className="text-xs text-muted-foreground">{item.file}</code>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{item.targets}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">
                                규격 {item.width}x{item.height}
                              </Badge>
                              {item.exists ? (
                                <Badge variant={item.match ? 'default' : 'destructive'} className="text-[10px]">
                                  {item.match ? (
                                    <span className="inline-flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> 일치
                                    </span>
                                  ) : (
                                    `실제 ${item.actualWidth}x{item.actualHeight}`
                                  )}
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[10px]">파일 없음</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end justify-center gap-2 sm:ml-auto shrink-0">
                          <label className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border cursor-pointer hover:bg-muted">
                            {uploading === item.file ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Upload className="w-3.5 h-3.5" />
                            )}
                            교체 업로드
                            <Input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              disabled={uploading !== null}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUpload(item.file, f);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          {item.exists && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              삭제
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>아이콘 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.file}&quot; 파일을 삭제하면 manifest 참조가 깨져
              해당 화면에서 아이콘이 표시되지 않습니다. 계속하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">참고</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• 교체 업로드 시 이미지가 규격({`{ 너비}x{높이}`})에 맞게 자동 조정됩니다. 정사각형에 가까운 원본을 권장합니다.</p>
          <p>• 스크린샷(wide 1280x720 / narrow 720x1280)은 비율이 다르므로 가로·세로 구도에 맞는 이미지를 사용하세요.</p>
          <p>• 아이콘 변경 후에는 설치된 PWA를 삭제 후 재설치해야 새 아이콘이 적용됩니다.</p>
          <p>• 기본 세트로 되돌리려면 서버에서 <code>bun scripts/generate-pwa-icons.ts</code>를 실행하세요.</p>
        </CardContent>
      </Card>
    </div>
  );
}
