'use client';

import { useState, useEffect, useCallback } from 'react';
import { MonitorSmartphone, Loader2, RotateCw, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { toast } from 'sonner';

// 키오스크 원격 제어 + 운영시간 (Content kiosk.* 키 기반, 폴링으로 전 단말 반영)
async function upsertContent(
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>,
  key: string,
  value: string,
  type: string
) {
  // 기존 조회 → 있으면 PUT, 없으면 POST
  const list = await authenticatedFetch('/api/admin/content');
  if (!list.ok) throw new Error('load failed');
  const data = await list.json();
  const existing = (data.items || []).find((i: { key: string; id: string }) => i.key === key);
  if (existing) {
    const res = await authenticatedFetch('/api/admin/content', {
      method: 'PUT',
      body: JSON.stringify({ id: existing.id, value, type }),
    });
    if (!res.ok) throw new Error('save failed');
  } else {
    const res = await authenticatedFetch('/api/admin/content', {
      method: 'POST',
      body: JSON.stringify({ key, category: 'kiosk', type, value, label: key }),
    });
    if (!res.ok) throw new Error('save failed');
  }
}

export default function KioskControl() {
  const { authenticatedFetch } = useAdminAuth();
  const [open, setOpen] = useState('');
  const [close, setClose] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await authenticatedFetch('/api/admin/content?category=kiosk');
      if (res.ok) {
        const data = await res.json();
        const items: { key: string; value: string }[] = data.items || [];
        const hours = items.find((i) => i.key === 'kiosk.hours');
        if (hours) {
          try {
            const parsed = JSON.parse(hours.value);
            setOpen(parsed.open || '');
            setClose(parsed.close || '');
          } catch { /* ignore */ }
        }
        setLoaded(true);
      }
    } catch { /* ignore */ }
  }, [authenticatedFetch]);

  useEffect(() => { load(); }, [load]);

  const sendCommand = async (action: 'reload' | 'home') => {
    setBusy(true);
    try {
      await upsertContent(
        authenticatedFetch,
        'kiosk.command',
        JSON.stringify({ action, at: new Date().toISOString(), id: `${Date.now()}` }),
        'json'
      );
      toast.success(action === 'reload' ? '모든 키오스크에 새로고침 명령을 보냈습니다.' : '모든 키오스크를 홈으로 이동시킵니다.');
    } catch {
      toast.error('명령 전송에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const saveHours = async () => {
    if (open && close && open >= close) {
      toast.error('종료 시각은 시작 시각보다 늦어야 합니다.');
      return;
    }
    setBusy(true);
    try {
      await upsertContent(authenticatedFetch, 'kiosk.hours', JSON.stringify({ open: open || null, close: close || null }), 'json');
      toast.success('운영시간이 저장되었습니다. (비워 두면 24시간 운영)');
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorSmartphone className="w-5 h-5 text-primary" />
          키오스크 원격 제어
        </CardTitle>
        <CardDescription>전시장 단말에 명령·운영시간을 반영합니다 (최대 15초 내 적용)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => sendCommand('reload')} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCw className="w-4 h-4 mr-2" />}
            전체 새로고침
          </Button>
          <Button variant="outline" onClick={() => sendCommand('home')} disabled={busy}>
            <Home className="w-4 h-4 mr-2" />
            전체 홈으로
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div className="space-y-1">
            <Label>운영 시작 (비우면 제한 없음)</Label>
            <Input type="time" value={loaded ? open : ''} onChange={(e) => setOpen(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>운영 종료 (비우면 제한 없음)</Label>
            <Input type="time" value={loaded ? close : ''} onChange={(e) => setClose(e.target.value)} />
          </div>
        </div>
        <Button onClick={saveHours} disabled={busy} size="sm">
          {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          운영시간 저장
        </Button>
      </CardContent>
    </Card>
  );
}
