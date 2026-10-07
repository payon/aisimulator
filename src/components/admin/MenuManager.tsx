'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ListOrdered,
  Save,
  RotateCcw,
  Loader2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { refreshCmsContent } from '@/hooks/use-cms-content';
import { TABS } from '@/types';
import { parseNavOrder, parseNavHidden, navLabelKey } from '@/lib/menu';
import { toast } from 'sonner';

interface MenuRow {
  id: string;
  defaultLabel: string;
  label: string; // 표시 이름 (기본값과 같으면 저장 시 생략 가능 — 그대로 저장해도 무방)
  visible: boolean;
}

const DEFAULT_ORDER = TABS.map((t) => t.id);

export default function MenuManager() {
  const { authenticatedFetch } = useAdminAuth();
  const [rows, setRows] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadMenus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/menus');
      if (res.ok) {
        const data = await res.json();
        const order = parseNavOrder(data.order || '', DEFAULT_ORDER);
        const hidden = new Set(parseNavHidden(data.hidden || '', DEFAULT_ORDER));
        const labels = (data.labels || {}) as Record<string, string>;
        setRows(
          order.map((id) => {
            const tab = TABS.find((t) => t.id === id)!;
            return {
              id,
              defaultLabel: tab.label,
              label: labels[id] ?? tab.label,
              visible: !hidden.has(id),
            };
          }),
        );
        setHasChanges(false);
      } else if (res.status !== 401) {
        toast.error('메뉴 설정을 불러오지 못했습니다.');
      }
    } catch {
      toast.error('메뉴 설정을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  const move = (index: number, dir: -1 | 1) => {
    setRows((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setHasChanges(true);
  };

  const toggleVisible = (index: number) => {
    setRows((prev) => {
      const visibleCount = prev.filter((r) => r.visible).length;
      if (prev[index].visible && visibleCount <= 1) {
        toast.error('모든 메뉴를 숨길 수는 없습니다. 최소 1개는 표시해야 합니다.');
        return prev;
      }
      const next = [...prev];
      next[index] = { ...next[index], visible: !next[index].visible };
      return next;
    });
    setHasChanges(true);
  };

  const updateLabel = (index: number, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], label: value };
      return next;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const labels: Record<string, string> = {};
      for (const r of rows) labels[r.id] = r.label.trim();
      const res = await authenticatedFetch('/api/admin/menus', {
        method: 'POST',
        body: JSON.stringify({
          order: rows.map((r) => r.id),
          hidden: rows.filter((r) => !r.visible).map((r) => r.id),
          labels,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('메뉴가 저장되었습니다. 프론트에 즉시 반영됩니다.');
        setHasChanges(false);
        refreshCmsContent();
      } else if (res.status !== 401) {
        toast.error(data.error || '저장에 실패했습니다.');
      }
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await authenticatedFetch('/api/admin/menus', { method: 'DELETE' });
      if (res.ok) {
        toast.success('메뉴 순서가 기본값으로 초기화되었습니다.');
        loadMenus();
        refreshCmsContent();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || '초기화에 실패했습니다.');
      }
    } catch {
      toast.error('초기화 중 오류가 발생했습니다.');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">메뉴 설정을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">메뉴 관리</h2>
          <Badge variant="outline" className="text-xs">
            프론트 즉시 반영
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              변경 사항 있음
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleReset} disabled={resetting}>
            {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            순서 초기화
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        사이드바와 홈 화면의 메뉴 순서·표시 여부·이름을 관리합니다.
        위/아래 버튼으로 순서를 바꾸고, 눈 아이콘으로 숨기거나 보이게 하세요.
        저장하면 모든 화면에 바로 반영되며, 나중에 메뉴가 추가되어도 여기에 자동으로 나타납니다.
      </p>

      <div className="grid gap-2">
        {rows.map((row, i) => (
          <motion.div
            key={row.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Card className={!row.visible ? 'opacity-60' : ''}>
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="shrink-0 w-8 justify-center">
                    {i + 1}
                  </Badge>
                  <div className="flex flex-col shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      title="위로 이동"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={i === rows.length - 1}
                      onClick={() => move(i, 1)}
                      title="아래로 이동"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      {row.id} <code className="font-mono">{navLabelKey(row.id)}</code>
                    </Label>
                    <Input
                      value={row.label}
                      onChange={(e) => updateLabel(i, e.target.value)}
                      maxLength={30}
                      placeholder={row.defaultLabel}
                      className="h-9"
                    />
                  </div>
                  <Button
                    variant={row.visible ? 'default' : 'outline'}
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => toggleVisible(i)}
                    title={row.visible ? '숨기기' : '보이기'}
                  >
                    {row.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
