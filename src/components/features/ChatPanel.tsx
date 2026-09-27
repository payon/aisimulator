'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Send,
  Volume2,
  VolumeX,
  Trash2,
  Bot,
  User,
  Mic,
  MicOff,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Message } from '@/types';
import { useCmsContent } from '@/hooks/use-cms-content';
import { useSettingsStore } from '@/stores/index';
import { useVoiceInput } from '@/hooks/use-voice';
import { useMockMode } from '@/hooks/use-mock-mode';
import MockModeIndicator from '@/components/features/MockModeIndicator';

interface ChatPanelProps {
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  speak: (text: string, rate?: number) => void;
  stop: () => void;
  engineReady?: boolean;
  speakServer?: (text: string) => Promise<boolean>;
}

export default function ChatPanel({ voiceEnabled, onToggleVoice, speak, stop, engineReady = true, speakServer }: ChatPanelProps) {
  const { getContent } = useCmsContent();
  const { readingSpeed, fontSize } = useSettingsStore();
  const { mockMode } = useMockMode();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAutoScrollRef = useRef(true);
  const { isListening, transcript, startListening, stopListening } = useVoiceInput();

  // 음성 출력 (브라우저 엔진 우선, 없으면 서버 TTS 폴백)
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

  // 음성 인식 결과 반영
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (!initialized) {
      const welcomeMsg = getContent('chat.welcome', '안녕하세요! 저는 AI 교사입니다. 😊 AI에 대해 궁금한 것이 있으시면 무엇이든 물어보세요!\n\n예를 들어:\n• "AI란 무엇인가요?"\n• "AI가 우리 생활에 어떻게 도움이 될까요?"\n• "ChatGPT는 어떻게 작동하나요?"');
      setMessages([{ role: 'assistant', content: welcomeMsg }]);
      setInitialized(true);
    }
  }, [getContent, initialized]);

  // 메시지 영역 자동 스크롤
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (isAutoScrollRef.current) {
      // 약간의 지연으로 DOM 업데이트 후 스크롤
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [messages, scrollToBottom]);

  // 사용자가 수동으로 스크롤하면 자동 스크롤 일시 중지
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // 하단에서 100px 이내면 자동 스크롤 유지
    isAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    const clearMsg = getContent('chat.clearMessage', '대화가 초기화되었습니다. 새로운 질문을 시작해보세요! 😊');
    setMessages([{ role: 'assistant', content: clearMsg }]);
    stop();
    toast.success('대화가 초기화되었습니다');
  };

  // 시니어용 더 큰 메시지 폰트
  const msgFontClass = fontSize === 'xlarge' ? 'text-base' : fontSize === 'large' ? 'text-sm' : 'text-sm';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-sm">{getContent('chat.title', 'AI 대화하기')}</h2>
            <p className="text-xs text-muted-foreground">{getContent('chat.subtitle', 'AI와 자유롭게 대화하세요')}</p>
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
          <Button variant="ghost" size="icon" onClick={handleClear} className="h-9 w-9" title="대화 초기화">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 메시지 영역 - min-h-0 필수: flex 자식이 내용보다 작아질 수 있게 함 */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 scroll-smooth"
        onScroll={handleScroll}
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="space-y-4 max-w-2xl mx-auto">
          {/* 시뮬레이션 모드 안내 */}
          {mockMode && (
            <MockModeIndicator feature="chat" />
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
                  {/* 시뮬레이션 배지 */}
                  {msg.role === 'assistant' && msg.mockMode && (
                    <Badge variant="secondary" className="mt-1.5 text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-0">
                      시뮬레이션
                    </Badge>
                  )}
                  {/* TTS 개별 메시지 읽기 버튼 */}
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
                  <span className="text-xs text-muted-foreground">{getContent('chat.loadingText', 'AI가 답변을 생성하고 있어요...')}</span>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* 입력 영역 - shrink-0: 압축되지 않도록 보장 */}
      <div className="shrink-0 border-t p-3 sm:p-4 bg-card">
        <div className="max-w-2xl mx-auto flex gap-2">
          {/* 음성 입력 버튼 */}
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
            placeholder={isListening ? '🎤 말씀하세요...' : getContent('chat.placeholder', 'AI에게 질문하세요...')}
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
