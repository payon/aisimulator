'use client';

import { useState, useEffect, useCallback } from 'react';
import { KeyRound, ShieldCheck, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { toast } from 'sonner';

export default function SecurityPanel() {
  const { authenticatedFetch } = useAdminAuth();
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [token, setToken] = useState('');
  const [disablePw, setDisablePw] = useState('');
  const [busy, setBusy] = useState(false);

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const res = await authenticatedFetch('/api/admin/auth/totp');
      if (res.ok) {
        const data = await res.json();
        setTotpEnabled(!!data.totpEnabled);
      }
    } catch { /* ignore */ }
  }, [authenticatedFetch]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== newPw2) { toast.error('새 비밀번호가 일치하지 않습니다.'); return; }
    setBusy(true);
    try {
      const res = await authenticatedFetch('/api/admin/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('비밀번호가 변경되었습니다.');
        setOldPw(''); setNewPw(''); setNewPw2('');
      } else if (res.status !== 401) {
        toast.error(data.error || '변경에 실패했습니다.');
      }
    } finally { setBusy(false); }
  };

  const handleSetup = async () => {
    setBusy(true);
    try {
      const res = await authenticatedFetch('/api/admin/auth/totp', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSecret(data.secret); setOtpauthUrl(data.otpauthUrl);
      } else if (res.status !== 401) {
        toast.error(data.error || '발급에 실패했습니다.');
      }
    } finally { setBusy(false); }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await authenticatedFetch('/api/admin/auth/totp', {
        method: 'PUT',
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('2단계 인증이 활성화되었습니다.');
        setSecret(''); setOtpauthUrl(''); setToken('');
        loadStatus();
      } else if (res.status !== 401) {
        toast.error(data.error || '인증 코드가 올바르지 않습니다.');
      }
    } finally { setBusy(false); }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await authenticatedFetch('/api/admin/auth/totp', {
        method: 'DELETE',
        body: JSON.stringify({ password: disablePw }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('2단계 인증이 비활성화되었습니다.');
        setDisablePw('');
        loadStatus();
      } else if (res.status !== 401) {
        toast.error(data.error || '비밀번호가 올바르지 않습니다.');
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">내 계정 보안</h2>
        <p className="text-muted-foreground">비밀번호 변경 및 2단계 인증(TOTP) 관리</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            비밀번호 변경
          </CardTitle>
          <CardDescription>8자 이상, 영문+숫자 포함 (특수문자 권장)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePassword} className="space-y-3 max-w-md">
            <div className="space-y-1">
              <Label>현재 비밀번호</Label>
              <Input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="space-y-1">
              <Label>새 비밀번호</Label>
              <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="space-y-1">
              <Label>새 비밀번호 확인</Label>
              <Input type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} autoComplete="new-password" />
            </div>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              변경하기
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            2단계 인증 (TOTP)
            <Badge variant={totpEnabled ? 'default' : 'outline'}>{totpEnabled ? '사용 중' : '미사용'}</Badge>
          </CardTitle>
          <CardDescription>Google Authenticator 등 인증 앱의 6자리 코드로 로그인 보안 강화</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 max-w-md">
          {!totpEnabled && !secret && (
            <Button variant="outline" onClick={handleSetup} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              인증 앱 등록 시작
            </Button>
          )}
          {!totpEnabled && secret && (
            <form onSubmit={handleEnable} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                인증 앱에 아래 키를 입력한 뒤 6자리 코드를 입력하세요.
              </p>
              <div className="p-3 rounded-lg bg-muted font-mono text-sm break-all select-all">{secret}</div>
              <p className="text-xs text-muted-foreground break-all">{otpauthUrl}</p>
              <div className="space-y-1">
                <Label>인증 코드</Label>
                <Input
                  inputMode="numeric"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="text-center text-xl tracking-[0.4em]"
                />
              </div>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                활성화하기
              </Button>
            </form>
          )}
          {totpEnabled && (
            <form onSubmit={handleDisable} className="space-y-3">
              <p className="text-sm text-muted-foreground">비활성화하려면 비밀번호를 입력하세요.</p>
              <div className="space-y-1">
                <Label>비밀번호</Label>
                <Input type="password" value={disablePw} onChange={(e) => setDisablePw(e.target.value)} autoComplete="current-password" />
              </div>
              <Button type="submit" variant="destructive" disabled={busy}>
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                2단계 인증 끄기
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
