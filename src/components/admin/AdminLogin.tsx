'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, Sparkles, Loader2, ShieldCheck, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { toast } from 'sonner';

type Stage = 'credentials' | 'totp' | 'force-change';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [stage, setStage] = useState<Stage>('credentials');
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, verifyTotp, changePassword } = useAdminAuth();

  useEffect(() => {
    fetch('/api/admin/sso/status')
      .then((r) => r.json())
      .then((d) => setSsoEnabled(!!d.enabled))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const result = await login(email, password);
      if (result.ok) {
        toast.success('로그인 성공!');
      } else if ('totpRequired' in result && result.totpRequired) {
        setTempToken(result.tempToken);
        setStage('totp');
        toast.info('2단계 인증 코드를 입력해주세요.');
      } else if ('mustChangeRequired' in result && result.mustChangeRequired) {
        setTempToken(result.tempToken);
        setStage('force-change');
        toast.warning('비밀번호를 변경해야 합니다.');
      } else {
        toast.error(result.error || '이메일 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch {
      toast.error('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totp.length !== 6) {
      toast.error('6자리 인증 코드를 입력해주세요.');
      return;
    }
    setIsLoggingIn(true);
    try {
      const ok = await verifyTotp(tempToken, totp);
      if (ok) toast.success('로그인 성공!');
      else toast.error('인증 코드가 올바르지 않습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForceChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPassword2) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setIsLoggingIn(true);
    try {
      const r = await changePassword({ tempToken, newPassword });
      if (r.ok) {
        toast.success('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
        setStage('credentials');
        setPassword('');
        setNewPassword('');
        setNewPassword2('');
      } else {
        toast.error(r.error || '변경에 실패했습니다.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-xl bg-primary flex items-center justify-center mb-2">
              <Sparkles className="w-7 h-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">
              {stage === 'totp' ? '2단계 인증' : stage === 'force-change' ? '비밀번호 변경' : '관리자 로그인'}
            </CardTitle>
            <CardDescription>AI 플랫폼 관리 대시보드</CardDescription>
          </CardHeader>
          <CardContent>
            {stage === 'credentials' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@aiplatform.kr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      autoComplete="email"
                      disabled={isLoggingIn}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="admin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      autoComplete="current-password"
                      disabled={isLoggingIn}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoggingIn}>
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      로그인 중...
                    </>
                  ) : (
                    '로그인'
                  )}
                </Button>
                {ssoEnabled && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => { window.location.href = '/api/admin/sso/login'; }}
                  >
                    SSO로 로그인
                  </Button>
                )}
              </form>
            )}

            {stage === 'totp' && (
              <form onSubmit={handleTotp} className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="w-4 h-4" />
                  인증 앱(Google Authenticator 등)의 6자리 코드를 입력하세요.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-totp">인증 코드</Label>
                  <Input
                    id="admin-totp"
                    inputMode="numeric"
                    placeholder="123456"
                    value={totp}
                    onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-2xl tracking-[0.5em]"
                    autoComplete="one-time-code"
                    disabled={isLoggingIn}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoggingIn}>
                  {isLoggingIn ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  인증하기
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setStage('credentials')}>
                  돌아가기
                </Button>
              </form>
            )}

            {stage === 'force-change' && (
              <form onSubmit={handleForceChange} className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <KeyRound className="w-4 h-4" />
                  최초 로그인 또는 관리자 요청으로 비밀번호 변경이 필요합니다. (8자 이상, 영문+숫자)
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-newpw">새 비밀번호</Label>
                  <Input
                    id="admin-newpw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={isLoggingIn}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-newpw2">새 비밀번호 확인</Label>
                  <Input
                    id="admin-newpw2"
                    type="password"
                    value={newPassword2}
                    onChange={(e) => setNewPassword2(e.target.value)}
                    autoComplete="new-password"
                    disabled={isLoggingIn}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoggingIn}>
                  {isLoggingIn ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  변경하고 계속하기
                </Button>
              </form>
            )}

            {stage === 'credentials' && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground space-y-1">
                <p className="font-medium">기본 관리자 계정</p>
                <p>이메일: <code className="bg-muted px-1 py-0.5 rounded text-[11px]">admin@aiplatform.kr</code></p>
                <p>비밀번호: <code className="bg-muted px-1 py-0.5 rounded text-[11px]">admin123</code> (첫 로그인 시 변경 필요)</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
