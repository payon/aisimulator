'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Zap,
  Shield,
  Globe,
  FlaskConical,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { PWASettingsPanel } from '@/components/pwa/PWASettingsPanel';

interface SettingsData {
  provider: string;
  hasOpenaiKey: boolean;
  hasGeminiKey: boolean;
  hasGrokKey: boolean;
  hasClaudeKey: boolean;
  openaiKeyPreview: string | null;
  geminiKeyPreview: string | null;
  grokKeyPreview: string | null;
  claudeKeyPreview: string | null;
}

const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4o-mini 등',
    color: 'bg-emerald-500',
    placeholder: 'sk-...',
    icon: '🤖',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini 2.0 Flash 등',
    color: 'bg-blue-500',
    placeholder: 'AIza...',
    icon: '✨',
  },
  {
    id: 'grok',
    name: 'xAI Grok',
    description: 'Grok-3, Grok-3-mini 등',
    color: 'bg-orange-500',
    placeholder: 'xai-...',
    icon: '🚀',
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    description: 'Claude Sonnet 4 등',
    color: 'bg-purple-500',
    placeholder: 'sk-ant-...',
    icon: '🧠',
  },
];

export default function SettingsPanel() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    gemini: '',
    grok: '',
    claude: '',
  });
  const [showKeys, setShowKeys] = useState({
    openai: false,
    gemini: false,
    grok: false,
    claude: false,
  });
  const [selectedProvider, setSelectedProvider] = useState('zai-built-in');
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { valid: boolean; error?: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [mockMode, setMockMode] = useState(false);
  const [mockModeLoading, setMockModeLoading] = useState(false);

  useEffect(() => {
    loadSettings();
    loadMockMode();
  }, []);

  const loadMockMode = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.mockMode !== undefined) {
          setMockMode(data.data.mockMode);
        }
      }
    } catch { /* ignore */ }
  };

  const toggleMockMode = async () => {
    setMockModeLoading(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockMode: !mockMode }),
      });
      if (res.ok) {
        setMockMode(!mockMode);
        toast.success(!mockMode ? '시뮬레이션 모드가 켜졌습니다' : '시뮬레이션 모드가 꺼졌습니다');
      } else {
        toast.error('설정 변경에 실패했습니다.');
      }
    } catch {
      toast.error('설정 변경 중 오류가 발생했습니다.');
    } finally {
      setMockModeLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
        setSelectedProvider(data.data.provider);
      }
    } catch {
      toast.error('설정을 불러오지 못했습니다.');
    }
  };

  const testApiKey = async (providerId: string) => {
    const key = apiKeys[providerId as keyof typeof apiKeys];
    if (!key) {
      toast.error('API Key를 먼저 입력해주세요.');
      return;
    }

    setTestingProvider(providerId);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId, key }),
      });
      const data = await response.json();
      if (data.success) {
        setTestResults((prev) => ({ ...prev, [providerId]: data.data }));
        if (data.data.valid) {
          toast.success(`${providerId} API Key가 유효합니다!`);
        } else {
          toast.error(`API Key 테스트 실패: ${data.data.error}`);
        }
      }
    } catch {
      toast.error('테스트 중 오류가 발생했습니다.');
    } finally {
      setTestingProvider(null);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          openaiKey: apiKeys.openai || null,
          geminiKey: apiKeys.gemini || null,
          grokKey: apiKeys.grok || null,
          claudeKey: apiKeys.claude || null,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('설정이 저장되었습니다! AI 기능이 업데이트됩니다.');
        loadSettings();
      } else {
        toast.error(data.error || '저장에 실패했습니다.');
      }
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b bg-card">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <Settings className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-semibold text-sm">설정</h2>
          <p className="text-xs text-muted-foreground">API 키 및 AI 제공자 설정</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Default Provider Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4" />
                기본 AI 제공자
              </CardTitle>
              <CardDescription>
                모든 AI 기능에 사용될 기본 제공자를 선택하세요. API 키가 설정되지 않은 경우 내장 AI가 사용됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Built-in option */}
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedProvider === 'zai-built-in' ? 'ring-2 ring-primary shadow-md' : ''
                  }`}
                  onClick={() => setSelectedProvider('zai-built-in')}
                >
                  <CardContent className="p-3 text-center">
                    <span className="text-2xl">⚡</span>
                    <p className="font-medium text-xs mt-1">내장 AI</p>
                    <p className="text-[10px] text-muted-foreground">필요 없음</p>
                    {selectedProvider === 'zai-built-in' && (
                      <Badge variant="default" className="mt-1 text-[10px]">사용 중</Badge>
                    )}
                  </CardContent>
                </Card>
                {PROVIDERS.map((p) => (
                  <Card
                    key={p.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedProvider === p.id ? 'ring-2 ring-primary shadow-md' : ''
                    }`}
                    onClick={() => setSelectedProvider(p.id)}
                  >
                    <CardContent className="p-3 text-center">
                      <span className="text-2xl">{p.icon}</span>
                      <p className="font-medium text-xs mt-1">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.id}</p>
                      {selectedProvider === p.id && (
                        <Badge variant="default" className="mt-1 text-[10px]">사용 중</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="w-4 h-4" />
                API Keys
              </CardTitle>
              <CardDescription>
                각 AI 제공자의 API Key를 입력하세요. 설정은 데이터베이스에 안전하게 저장됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {PROVIDERS.map((provider) => (
                <div key={provider.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm">
                      <span>{provider.icon}</span>
                      {provider.name}
                      {settings && (settings as Record<string, boolean>)[`has${provider.id.charAt(0).toUpperCase() + provider.id.slice(1)}Key`] && (
                        <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          설정됨
                        </Badge>
                      )}
                    </Label>
                    {testResults[provider.id] && (
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${
                          testResults[provider.id].valid
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {testResults[provider.id].valid ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            유효함
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            유효하지 않음
                          </>
                        )}
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showKeys[provider.id as keyof typeof showKeys] ? 'text' : 'password'}
                        placeholder={provider.placeholder}
                        value={apiKeys[provider.id as keyof typeof apiKeys]}
                        onChange={(e) =>
                          setApiKeys((prev) => ({
                            ...prev,
                            [provider.id]: e.target.value,
                          }))
                        }
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowKeys((prev) => ({
                            ...prev,
                            [provider.id]: !prev[provider.id as keyof typeof prev],
                          }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showKeys[provider.id as keyof typeof showKeys] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testApiKey(provider.id)}
                      disabled={!apiKeys[provider.id as keyof typeof apiKeys] || testingProvider === provider.id}
                    >
                      {testingProvider === provider.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{provider.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Environment Variables Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4" />
                환경 변수 (.env)
              </CardTitle>
              <CardDescription>
                .env 파일에 API 키를 직접 설정할 수도 있습니다. 설정 페이지에서 입력한 값이 우선합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-3 font-mono text-xs space-y-1 overflow-x-auto">
                <p className="text-muted-foreground"># .env 파일 설정 예시</p>
                <p>OPENAI_API_KEY=sk-your-openai-key</p>
                <p>GEMINI_API_KEY=AIza-your-gemini-key</p>
                <p>GROK_API_KEY=xai-your-grok-key</p>
                <p>CLAUDE_API_KEY=sk-ant-your-claude-key</p>
              </div>
            </CardContent>
          </Card>

          {/* 시뮬레이션(Mock) 모드 */}
          <Card className={mockMode ? 'border-amber-300 bg-amber-50/30' : ''}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                시뮬레이션 모드
                {mockMode && (
                  <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">
                    활성
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                인터넷이나 API 키 없이도 AI 기능이 어떻게 동작하는지 미리 볼 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {mockMode ? (
                    <WifiOff className="w-5 h-5 text-amber-600" />
                  ) : (
                    <Wifi className="w-5 h-5 text-green-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {mockMode ? '시뮬레이션 모드 (오프라인)' : '실제 AI 모드 (온라인)'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {mockMode
                        ? '미리 준비된 답변으로 동작을 시연합니다'
                        : '실제 AI API를 호출하여 답변을 생성합니다'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={mockMode}
                  onCheckedChange={toggleMockMode}
                  disabled={mockModeLoading}
                />
              </div>

              {mockMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2"
                >
                  <p className="text-sm font-medium text-amber-800">시뮬레이션 모드에서 제공되는 것:</p>
                  <ul className="text-xs text-amber-700 space-y-1 list-disc pl-4">
                    <li>AI 대화 - 주제별 미리 준비된 답변</li>
                    <li>AI 퀴즈 - 초급/중급/고급 각 5문제</li>
                    <li>이미지 변환 - 동작 시연 (원본 유지)</li>
                    <li>미래의 나 - 건강 팁 제공</li>
                    <li>음성 읽기(TTS) - 정상 동작</li>
                  </ul>
                  <p className="text-xs text-amber-600 mt-2">
                    💡 관리자 대시보드에서도 이 설정이 적용됩니다.
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* PWA 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                PWA & 앱 설치
              </CardTitle>
              <CardDescription>
                프로그레시브 웹 앱 설정, 오프라인 지원, 알림 및 TWA(Android 앱) 구성
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PWASettingsPanel />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-center pb-4">
            <Button
              onClick={saveSettings}
              disabled={isSaving}
              className="px-12 py-5 text-base"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  설정 저장
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
