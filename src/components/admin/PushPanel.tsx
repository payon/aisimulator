'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Send, Loader2, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { toast } from 'sonner';

interface PushStatus {
  vapidPublicKey: string | null;
  hasPrivateKey: boolean;
  count: number;
  subscriptions: { id: string; endpointPreview: string; userAgent: string | null; createdAt: string }[];
}

export default function PushPanel() {
  const { authenticatedFetch } = useAdminAuth();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [pub, setPub] = useState('');
  const [priv, setPriv] = useState('');
  const [title, setTitle] = useState('AI 플랫폼 알림');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await authenticatedFetch('/api/admin/push');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.vapidPublicKey) setPub(data.vapidPublicKey);
      }
    } catch { /* ignore */ }
  }, [authenticatedFetch]);

  useEffect(() => { load(); }, [load]);

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await authenticatedFetch('/api/admin/push', {
        method: 'POST',
        body: JSON.stringify({ vapidPublicKey: pub, vapidPrivateKey: priv }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('VAPID 키가 저장되었습니다.');
        setPriv('');
        load();
      } else if (res.status !== 401) {
        toast.error(data.error || '저장에 실패했습니다.');
      }
    } finally { setBusy(false); }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) { toast.error('제목과 내용을 입력해주세요.'); return; }
    setSending(true);
    try {
      const res = await authenticatedFetch('/api/pwa/notify', {
        method: 'POST',
        body: JSON.stringify({ title, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success(`발송 완료 (성공 ${data.sent}건, 실패 ${data.failed}건)`);
        setMessage('');
      } else if (res.status !== 401) {
        toast.error(data.error || '발송에 실패했습니다.');
      }
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-bold tracking-tight">푸시 알림</h2>
        <Badge variant="outline">구독 {status?.count ?? 0}건</Badge>
        <Badge variant={status?.vapidPublicKey && status?.hasPrivateKey ? 'default' : 'destructive'}>
          {status?.vapidPublicKey && status?.hasPrivateKey ? 'VAPID 설정됨' : 'VAPID 미설정'}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            VAPID 키 설정
          </CardTitle>
          <CardDescription>
            비공개키는 암호화 저장됩니다. 키 생성: <code>npx web-push generate-vapid-keys</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveKeys} className="space-y-3 max-w-xl">
            <div className="space-y-1">
              <Label>공개키</Label>
              <Input value={pub} onChange={(e) => setPub(e.target.value)} placeholder="B..." autoComplete="off" />
            </div>
            <div className="space-y-1">
              <Label>비공개키 (입력 시에만 전송, 화면에 표시 안 됨)</Label>
              <Input
                type="password"
                value={priv}
                onChange={(e) => setPriv(e.target.value)}
                placeholder={status?.hasPrivateKey ? '저장됨 (변경 시에만 입력)' : '비공개키 입력'}
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              저장하기
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            알림 발송 (전체 구독자)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-3 max-w-xl">
            <div className="space-y-1">
              <Label>제목</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>내용</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
            </div>
            <Button type="submit" disabled={sending}>
              {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              보내기
            </Button>
          </form>
        </CardContent>
      </Card>

      {status && status.subscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">구독 목록 (최근 100건)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {status.subscriptions.map((s) => (
              <div key={s.id} className="text-xs border rounded p-2 space-y-0.5">
                <p className="font-mono break-all">{s.endpointPreview}</p>
                <p className="text-muted-foreground">
                  {s.userAgent || 'unknown'} · {new Date(s.createdAt).toLocaleString('ko-KR')}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
