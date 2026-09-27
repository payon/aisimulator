
---

## 📄 5. PROGRAM.md

```markdown
# 프로그래밍 가이드

## 1. 개발 환경 설정

### 1.1 필수 도구
```bash
# Node.js 20 LTS
nvm install 20
nvm use 20

# 패키지 매니저
npm install -g pnpm

# 개발 도구
npm install -g typescript ts-node

1.2 프로젝트 초기화

# 프로젝트 생성
npx create-next-app@latest ai-learning-hub --typescript --tailwind --app --src-dir

cd ai-learning-hub

# 추가 패키지 설치
pnpm add zustand zod ioredis @tanstack/react-query
pnpm add @radix-ui/react-dialog @radix-ui/react-tabs
pnpm add react-dropzone react-webcam
pnpm add dompurify marked

pnpm add -D @testing-library/react @testing-library/jest-dom
pnpm add -D cypress playwright jest @types/jest

2. 코딩 표준
2.1 네이밍 컨벤션

// 파일명: kebab-case
// chat-message.tsx, image-service.ts

// 컴포넌트: PascalCase
export function ChatMessage() { }
export function ImageUploadForm() { }

// 함수/변수: camelCase
const userName = '홍길동';
function sendMessage() { }

// 상수: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

// 타입: PascalCase + 접미사
interface ChatMessage { }
type ChatRole = 'user' | 'assistant';
type ApiResponseType<T> = { data: T; error?: string };

2.2 컴포넌트 작성 가이드
// ✅ 올바른 컴포넌트 작성
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  onClick?: () => void;
  'data-testid'?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'lg', // 시니어 기본 크기
  disabled = false,
  onClick,
  'data-testid': testId,
}: ButtonProps) {
  const baseStyles = 'rounded-xl font-semibold transition-all duration-200 focus:ring-4 focus:ring-offset-2';
  
  const variantStyles = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-300',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-300',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-300',
  };
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm min-w-[40px] min-h-[40px]',
    md: 'px-6 py-3 text-base min-w-[48px] min-h-[48px]',
    lg: 'px-8 py-4 text-lg min-w-[56px] min-h-[56px]',
    xl: 'px-10 py-5 text-xl min-w-[72px] min-h-[72px]',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} 
                 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

2.3 에러 처리 패턴
// 커스텀 에러 클래스
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AIProviderError extends AppError {
  constructor(message: string, public provider: string) {
    super(message, 'AI_PROVIDER_ERROR', 502);
    this.name = 'AIProviderError';
  }
}

// 에러 바운더리 컴포넌트
'use client';
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 에러 로깅 서비스로 전송
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center">
          <h2 className="text-2xl text-red-600 mb-4">문제가 발생했습니다</h2>
          <p className="text-lg mb-4">잠시 후 다시 시도해주세요.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="bg-blue-500 text-white px-6 py-3 rounded-xl text-lg"
          >
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

3. 핵심 기능 구현
3.1 AI 채팅 구현
// components/chat/ChatInterface.tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/chat.store';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { speak } = useSpeechSynthesis();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async (content: string) => {
    const userMessage: Message = { role: 'user', content, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          context: messages.slice(-10), // 최근 10개 메시지만 컨텍스트로
        }),
      });

      if (!response.ok) throw new Error('API error');
      
      const data = await response.json();
      const aiMessage: Message = {
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMessage]);
      
      // 자동 읽어주기 (설정에 따라)
      if (useSettingsStore.getState().voiceEnabled) {
        speak(data.reply);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '죄송합니다. 잠시 후 다시 시도해주세요.',
        timestamp: Date.now(),
        isError: true,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && <ChatWelcome />}
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} message={msg} onSpeak={speak} />
        ))}
        {isLoading && <ChatTyping />}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}

3.2 이미지 업로드 및 변환
// components/image/ImageUploader.tsx
'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useImageUpload } from '@/hooks/useImageUpload';

const STYLE_OPTIONS = [
  { id: 'watercolor', label: '수채화', emoji: '🎨' },
  { id: 'oil', label: '유화', emoji: '🖌️' },
  { id: 'cartoon', label: '만화', emoji: '✏️' },
  { id: 'vintage', label: '빈티지', emoji: '📸' },
  { id: 'anime', label: '애니메이션', emoji: '🌸' },
  { id: 'pencil', label: '연필스케치', emoji: '✍️' },
];

export function ImageUploader() {
  const [selectedStyle, setSelectedStyle] = useState<string>('watercolor');
  const [result, setResult] = useState<string | null>(null);
  const { upload, isProcessing, progress } = useImageUpload();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    try {
      const resultUrl = await upload(file, selectedStyle);
      setResult(resultUrl);
    } catch (error) {
      alert('이미지 변환에 실패했습니다. 다시 시도해주세요.');
    }
  }, [selectedStyle, upload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
  });

  return (
    <div className="space-y-6">
      {/* 업로드 영역 */}
      <div
        {...getRootProps()}
        className={`border-4 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
      >
        <input {...getInputProps()} data-testid="file-upload" />
        <div className="text-6xl mb-4">📷</div>
        <p className="text-2xl font-semibold text-gray-700">
          {isDragActive ? '여기에 놓으세요!' : '사진을 여기에 끌어놓거나 클릭하세요'}
        </p>
        <p className="text-lg text-gray-500 mt-2">
          JPG, PNG, WebP (최대 10MB)
        </p>
      </div>

      {/* 스타일 선택 */}
      <div>
        <h3 className="text-xl font-bold mb-4">원하는 화풍을 선택하세요</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {STYLE_OPTIONS.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={`p-4 rounded-xl text-lg font-semibold transition-all
                ${selectedStyle === style.id 
                  ? 'bg-blue-500 text-white ring-4 ring-blue-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              data-testid={`style-${style.id}`}
            >
              <span className="text-3xl block mb-2">{style.emoji}</span>
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* 처리 중 표시 */}
      {isProcessing && (
        <div className="text-center p-8 bg-blue-50 rounded-xl">
          <div className="text-4xl mb-4 animate-bounce">🎨</div>
          <p className="text-xl font-semibold">AI가 그림을 그리고 있어요...</p>
          <div className="w-full bg-gray-200 rounded-full h-4 mt-4">
            <div
              className="bg-blue-500 h-4 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-lg">{progress}% 완료</p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-4">변환 완료! 🎉</h3>
          <img src={result} alt="변환된 이미지" className="max-w-full rounded-xl shadow-lg" />
          <div className="mt-4 flex justify-center gap-4">
            <a href={result} download className="bg-green-500 text-white px-6 py-3 rounded-xl text-lg">
              💾 저장하기
            </a>
            <button onClick={() => setResult(null)} className="bg-gray-500 text-white px-6 py-3 rounded-xl text-lg">
              🔄 다시하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

3.3 미래의 나의 모습 (나이 변환)
// components/future/FutureSelf.tsx
'use client';
import { useState } from 'react';
import Webcam from 'react-webcam';

const AGE_OPTIONS = [
  { age: 60, label: '60대', emoji: '👨‍🦳' },
  { age: 70, label: '70대', emoji: '👴' },
  { age: 80, label: '80대', emoji: '🧓' },
  { age: 90, label: '90대', emoji: '👵' },
];

export function FutureSelf() {
  const [step, setStep] = useState<'capture' | 'select' | 'result'>('capture');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedAge, setSelectedAge] = useState<number>(70);
  const [result, setResult] = useState<string | null>(null);
  const [healthTips, setHealthTips] = useState<string[]>([]);
  const webcamRef = useRef<Webcam>(null);

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setStep('select');
    }
  };

  const generateFutureSelf = async () => {
    setStep('result');
    
    try {
      const response = await fetch('/api/future-self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: capturedImage,
          targetAge: selectedAge,
        }),
      });
      
      const data = await response.json();
      setResult(data.futureImage);
      setHealthTips(data.healthTips);
    } catch (error) {
      alert('미래 모습을 생성하는데 실패했습니다.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {step === 'capture' && (
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6">📸 사진을 찍어주세요</h2>
          <div className="rounded-2xl overflow-hidden mb-6">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
              className="w-full"
            />
          </div>
          <button
            onClick={capture}
            className="bg-blue-500 text-white px-8 py-4 rounded-xl text-xl font-bold"
          >
            📷 사진 찍기
          </button>
        </div>
      )}

      {step === 'select' && (
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6">미래의 내 모습</h2>
          <img src={capturedImage!} alt="현재 사진" className="w-48 h-48 rounded-full mx-auto mb-6" />
          
          <h3 className="text-xl font-semibold mb-4">어떤 나이대의 내 모습을 보고 싶으신가요?</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {AGE_OPTIONS.map((option) => (
              <button
                key={option.age}
                onClick={() => setSelectedAge(option.age)}
                className={`p-4 rounded-xl text-lg font-semibold transition-all
                  ${selectedAge === option.age
                    ? 'bg-blue-500 text-white ring-4 ring-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <span className="text-4xl block">{option.emoji}</span>
                {option.label}
              </button>
            ))}
          </div>
          
          <button
            onClick={generateFutureSelf}
            className="bg-green-500 text-white px-8 py-4 rounded-xl text-xl font-bold"
          >
            🔮 미래 모습 보기
          </button>
        </div>
      )}

      {step === 'result' && result && (
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6">✨ {selectedAge}대의 나</h2>
          <div className="flex justify-center gap-4 mb-6">
            <div>
              <p className="text-lg mb-2">현재</p>
              <img src={capturedImage!} alt="현재" className="w-48 h-48 rounded-xl" />
            </div>
            <div className="flex items-center text-4xl">→</div>
            <div>
              <p className="text-lg mb-2">{selectedAge}대</p>
              <img src={result} alt="미래" className="w-48 h-48 rounded-xl" />
            </div>
          </div>
          
          {/* 건강 팁 */}
          <div className="bg-green-50 p-6 rounded-xl text-left">
            <h3 className="text-xl font-bold mb-3">💚 건강 관리 팁</h3>
            <ul className="space-y-2">
              {healthTips.map((tip, idx) => (
                <li key={idx} className="text-lg flex items-start">
                  <span className="mr-2">✅</span> {tip}
                </li>
              ))}
            </ul>
          </div>
          
          <button
            onClick={() => { setStep('capture'); setResult(null); }}
            className="mt-6 bg-blue-500 text-white px-8 py-4 rounded-xl text-xl font-bold"
          >
            🔄 다시 해보기
          </button>
        </div>
      )}
    </div>
  );
}

3.4 AI 퀴즈 시스템
// components/quiz/QuizEngine.tsx
'use client';
import { useState, useEffect } from 'react';
import { QuizQuestion } from './QuizQuestion';
import { QuizResult } from './QuizResult';
import { quizService } from '@/services/quiz.service';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export function QuizEngine() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');

  useEffect(() => {
    loadQuestions();
  }, [difficulty]);

  const loadQuestions = async () => {
    const qs = await quizService.getQuestions(difficulty, 10);
    setQuestions(qs);
    setCurrentIndex(0);
    setAnswers([]);
    setShowResult(false);
  };

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...answers, answerIndex];
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResult(true);
    }
  };

  const score = answers.reduce((acc, answer, idx) => {
    return acc + (answer === questions[idx]?.correctAnswer ? 1 : 0);
  }, 0);

  if (questions.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="text-6xl mb-4 animate-spin">⏳</div>
        <p className="text-xl">문제를 불러오는 중...</p>
      </div>
    );
  }

  if (showResult) {
    return (
      <QuizResult
        score={score}
        total={questions.length}
        answers={answers}
        questions={questions}
        onRetry={loadQuestions}
      />
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* 진행률 */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-lg font-semibold">
            문제 {currentIndex + 1} / {questions.length}
          </span>
          <span className="text-lg font-semibold">
            난이도: {difficulty === 'easy' ? '입문' : difficulty === 'medium' ? '중급' : '고급'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-blue-500 h-4 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 난이도 선택 (첫 문제일 때만) */}
      {currentIndex === 0 && (
        <div className="flex gap-2 mb-4">
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-4 py-2 rounded-lg text-sm
                ${difficulty === d ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
            >
              {d === 'easy' ? '🌱 입문' : d === 'medium' ? '🌿 중급' : '🌳 고급'}
            </button>
          ))}
        </div>
      )}

      {/* 질문 */}
      <QuizQuestion
        question={currentQuestion}
        onAnswer={handleAnswer}
        questionNumber={currentIndex + 1}
      />
    </div>
  );
}

4. 접근성 구현
4.1 음성 입력/출력

// hooks/useVoiceInput.ts
'use client';
import { useState, useEffect, useCallback } from 'react';

export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = true;
      recog.lang = 'ko-KR';

      recog.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          finalTranscript += event.results[i][0].transcript;
        }
        setTranscript(finalTranscript);
      };

      recog.onerror = (event) => {
        setError('음성 인식에 실패했습니다. 다시 시도해주세요.');
        setIsListening(false);
      };

      recog.onend = () => setIsListening(false);
      setRecognition(recog);
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognition) {
      setError(null);
      setTranscript('');
      recognition.start();
      setIsListening(true);
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition]);

  return { isListening, transcript, error, startListening, stopListening };
}

// hooks/useSpeechSynthesis.ts
export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && !('speechSynthesis' in window)) {
      setSupported(false);
    }
  }, []);

  const speak = useCallback((text: string, rate: number = 0.8) => {
    if (!supported || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [supported]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking, supported };
}

5. 빌드 및 배포
5.1 next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // 이미지 최적화
  images: {
    domains: ['localhost', process.env.S3_DOMAIN || ''].filter(Boolean),
    formats: ['image/avif', 'image/webp'],
  },

  // 보안 헤더
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  // PWA
  experimental: {
    optimizePackageImports: ['@radix-ui/react-*'],
  },
};

// PWA 설정 (next-pwa 사용 시)
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA(nextConfig);

5.2 환경 변수

# .env.local
# AI API
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_AI_KEY=AIzaSyD-xxx

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ai_learning
REDIS_URL=redis://localhost:6379

# Storage
S3_BUCKET=ai-learning-images
S3_REGION=ap-northeast-2
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx

# Security
JWT_SECRET=your-super-secret-key-here
ENCRYPTION_KEY=your-32-char-encryption-key
RATE_LIMIT_WINDOW=60
RATE_LIMIT_MAX=30

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx


