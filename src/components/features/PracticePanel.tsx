'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MessagesSquare,
  Send,
  Volume2,
  VolumeX,
  Trash2,
  Bot,
  User,
  Mic,
  MicOff,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Message, PracticeExample } from '@/types';
import { useCmsContent } from '@/hooks/use-cms-content';
import { useSettingsStore } from '@/stores/index';
import { useVoiceInput } from '@/hooks/use-voice';
import { useMockMode, formatMockSchedule } from '@/hooks/use-mock-mode';
import MockModeIndicator from '@/components/features/MockModeIndicator';
import { MOCK_PRACTICE_EXAMPLES } from '@/lib/mock-data';

interface PracticePanelProps {
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  speak: (text: string, rate?: number) => void;
  stop: () => void;
  engineReady?: boolean;
  speakServer?: (text: string) => Promise<boolean>;
}

function parseExamples(raw: string): PracticeExample[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.question === 'string' && e.question.trim().length > 0)
      .map((e, i) => ({
        id: typeof e.id === 'string' && e.id ? e.id : `ex-${i + 1}`,
        question: String(e.question).slice(0, 200),
        hint: typeof e.hint === 'string' ? e.hint : undefined,
      }));
  } catch {
    return [];
  }
}

export default function PracticePanel({ voiceEnabled, onToggleVoice, speak, stop, engineReady = true, speakServer }: PracticePanelProps) {
  const { getContent } = useCmsContent();
  const { readingSpeed, fontSize } = useSettingsStore();
  const { mockMode, mockSchedule } = useMockMode();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAutoScrollRef = useRef(true);
  const { isListening, transcript, startListening, stopListening } = useVoiceInput();

  // 예시 질문 목록: 시뮬레이션 모드에서는 관리자가 등록한 mock 예시 우선,
  // 일반 모드에서는 CMS practice.examples → 둘 다 없으면 기본값
  const mockExamples = parseExamples(getContent('mock.practice.examples', ''));
  const cmsExamples = parseExamples(getContent('practice.examples', ''));
  const examples: PracticeExample[] =
    (mockMode && mockExamples.length > 0 ? mockExamples : []).length > 0
      ? mockExamples
      : cmsExamples.length > 0
        ? cmsExamples
        : MOCK_PRACTICE_EXAMPLES;

  const speakReply = useCallback(async (text: string) => {
    if (engineReady) {
      speak(text, readingSpeed);
      return;
    }
    if (speakServer) {
      const ok = await speakServer(text);
      if (!ok) toast.error('음성을 재생할 수 없습니다. 서버 TTS 키를 확인해주세요.');
    } else {
      toast.error('이 기기에서는 음성 읽기를 지원하지 않습니다.');
    }
  }, [engineReady, speak, speakServer, readingSpeed]);

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (!initialized) {
      const welcomeMsg = getContent('practice.welcome', '안녕하세요! 여기는 질문 연습실이에요. 🙋\n\n아래 예시 질문 버튼을 눌러보세요. AI가 어떻게 답하는지 직접 확인할 수 있어요!\n\n익숙해지면 직접 질문을 써보세요. 😊');
      setMessages([{ role: 'assistant', content: welcomeMsg }]);
      setInitialized(true);
    }
  }, [getContent, initialized]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (isAutoScrollRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [messages, scrollToBottom]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          context: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMsg: Message = { role: 'assistant', content: data.reply, mockMode: data.mockMode || false };
        setMessages((prev) => [...prev, assistantMsg]);
        if (voiceEnabled) {
          speakReply(data.reply);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `⚠️ ${data.error || '오류가 발생했습니다.'}`, isError: true },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ 네트워크 오류가 발생했습니다. 다시 시도해주세요.', isError: true },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSend = () => sendMessage(input);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    const clearMsg = getContent('practice.clearMessage', '연습이 초기화되었습니다. 예시 질문을 눌러 다시 시작해보세요! 😊');
    setMessages([{ role: 'assistant', content: clearMsg }]);
    stop();
    toast.success('연습이 초기화되었습니다');
  };

  const msgFontClass = fontSize === 'xlarge' ? 'text-base' : fontSize === 'large' ? 'text-sm' : 'text-sm';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <MessagesSquare className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-sm">{getContent('practice.title', '예시 질문 체험')}</h2>
            <p className="text-xs text-muted-foreground">{getContent('practice.subtitle', '예시 질문으로 답변 과정을 체험하세요')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {voiceEnabled && (
            <Badge variant="secondary" className="text-[10px] gap-1 bg-primary/10 text-primary">
              <Volume2 className="w-3 h-3" />
              음성
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleVoice}
            className="h-9 w-9"
            title={voiceEnabled ? '음성 끄기' : '음성 켜기'}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClear} className="h-9 w-9" title="연습 초기화">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 예시 질문 버튼 영역 */}
      <div className="shrink-0 border-b bg-muted/30 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
            <Lightbulb className="w-3.5 h-3.5" />
            예시 질문을 눌러보세요
            {mockMode && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-0">
                시뮬레이션
              </Badge>
            )}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {examples.map((ex) => (
              <Button
                key={ex.id}
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() => sendMessage(ex.question)}
                className="shrink-0 h-auto py-2 px-3 text-xs font-medium whitespace-normal text-left leading-snug rounded-xl"
                title={ex.hint}
              >
                {ex.question}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 scroll-smooth"
        onScroll={handleScroll}
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="space-y-4 max-w-2xl mx-auto">
          {mockMode && (
            <MockModeIndicator feature="practice" scheduleText={formatMockSchedule(mockSchedule)} />
          )}
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-secondary'
                      : 'bg-gradient-to-br from-primary to-primary/80'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-secondary-foreground" />
                  ) : (
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${msgFontClass} whitespace-pre-wrap leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : msg.isError
                        ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-sm'
                        : 'bg-card border border-border rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                  {msg.role === 'assistant' && msg.mockMode && (
                    <Badge variant="secondary" className="mt-1.5 text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-0">
                      시뮬레이션
                    </Badge>
                  )}
                  {msg.role === 'assistant' && !msg.isError && voiceEnabled && (
                    <button
                      onClick={() => speakReply(msg.content)}
                      className="mt-2 inline-flex items-center gap-1 text-xs opacity-60 hover:opacity-100 transition-opacity"
                      title="이 답변 음성으로 듣기"
                    >
                      <Volume2 className="w-3 h-3" />
                      다시 듣기
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <Card className="rounded-2xl rounded-tl-sm shadow-sm">
                <CardContent className="p-4 flex items-center gap-2">
                  <div className="flex gap-1">
                    <motion.div
                      className="w-2 h-2 bg-muted-foreground/40 rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-muted-foreground/40 rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-muted-foreground/40 rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{getContent('practice.loadingText', 'AI가 답변을 준비하고 있어요...')}</span>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* 입력 영역 */}
      <div className="shrink-0 border-t p-3 sm:p-4 bg-card">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={isListening ? stopListening : startListening}
            className={`rounded-xl h-12 w-12 shrink-0 ${isListening ? 'bg-red-50 border-red-300 text-red-600' : ''}`}
            title={isListening ? '음성 입력 중지' : '음성으로 입력'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? '🎤 말씀하세요...' : getContent('practice.placeholder', '직접 질문을 써보세요...')}
            className="rounded-xl px-4 h-12 text-base"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="rounded-xl h-12 w-12 p-0 shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        {isListening && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-red-500 text-center mt-1"
          >
            🎤 듣고 있습니다... 말씀하세요
          </motion.p>
        )}
      </div>
    </div>
  );
}
