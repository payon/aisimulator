
---

## 📄 4. ARCHITECT.md

```markdown
# 시스템 아키텍처 문서

## 1. 아키텍처 개요

### 1.1 기술 스택
┌─────────────────────────────────────────────────┐
│ Frontend │
│ Next.js 14 (App Router) + TypeScript + Tailwind │
│ PWA + Service Worker + Web Workers │
├─────────────────────────────────────────────────┤
│ Backend │
│ Next.js API Routes + Node.js │
│ Python (FastAPI) for AI Processing │
├─────────────────────────────────────────────────┤
│ AI Services │
│ OpenAI API / Anthropic Claude / Google Gemini │
│ Stable Diffusion / DALL-E / Age Progression │
├─────────────────────────────────────────────────┤
│ Data Layer │
│ PostgreSQL + Redis + S3 (MinIO) │
├─────────────────────────────────────────────────┤
│ Infrastructure │
│ Docker + Kubernetes + GitHub Actions │
│ Cloudflare CDN + Nginx │
└─────────────────────────────────────────────────┘

### 1.2 시스템 다이어그램

                ┌─────────────────┐
                │   Cloudflare    │
                │   CDN / WAF     │
                └────────┬────────┘
                         │
                ┌────────▼────────┐
                │    Load Balancer │
                │    (Nginx)       │
                └────────┬────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
 ┌────────▼───┐  ┌──────▼─────┐  ┌─────▼──────┐
 │  Next.js   │  │  Next.js   │  │  Next.js   │
 │  SSR/SSG   │  │  SSR/SSG   │  │  SSR/SSG   │
 │  Server 1  │  │  Server 2  │  │  Server 3  │
 └────────┬───┘  └──────┬─────┘  └─────┬──────┘
          │              │              │
          └──────────────┼──────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
 ┌────────▼───┐  ┌──────▼─────┐  ┌─────▼──────┐
 │ PostgreSQL │  │   Redis    │  │ S3/MinIO   │
 │  (Data)    │  │  (Cache)   │  │ (Storage)  │
 └────────────┘  └────────────┘  └────────────┘
                         │
                ┌────────▼────────┐
                │  AI Processing   │
                │  (FastAPI)       │
                │  - Image AI      │
                │  - Chat AI       │
                │  - Age AI        │
                └────────┬────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
 ┌────────▼───┐  ┌──────▼─────┐  ┌─────▼──────┐
 │  OpenAI    │  │  Claude    │  │  Gemini    │
 │  API       │  │  API       │  │  API       │
 └────────────┘  └────────────┘  └────────────┘

 
## 2. 프론트엔드 아키텍처

### 2.1 디렉토리 구조

ai-learning-hub/
├── src/
│ ├── app/ # Next.js App Router
│ │ ├── layout.tsx
│ │ ├── page.tsx # 메인 페이지
│ │ ├── chat/ # AI 채팅
│ │ │ ├── page.tsx
│ │ │ └── components/
│ │ ├── image-transform/ # 이미지 변환
│ │ ├── future-self/ # 미래의 나의 모습
│ │ ├── quiz/ # AI 퀴즈
│ │ ├── prompt-learn/ # 프롬프트 배우기
│ │ ├── safety/ # AI 안전
│ │ ├── settings/ # 설정
│ │ └── api/ # API Routes
│ │ ├── chat/route.ts
│ │ ├── image/route.ts
│ │ ├── quiz/route.ts
│ │ └── upload/route.ts
│ │
│ ├── components/ # 공유 컴포넌트
│ │ ├── ui/ # 기본 UI
│ │ │ ├── Button.tsx
│ │ │ ├── Card.tsx
│ │ │ ├── Modal.tsx
│ │ │ └── index.ts
│ │ ├── layout/ # 레이아웃
│ │ │ ├── Header.tsx
│ │ │ ├── Navigation.tsx
│ │ │ └── Footer.tsx
│ │ └── shared/ # 공유
│ │ ├── AccessibilityPanel.tsx
│ │ ├── VoiceButton.tsx
│ │ └── LoadingSpinner.tsx
│ │
│ ├── hooks/ # 커스텀 훅
│ │ ├── useAccessibility.ts
│ │ ├── useVoiceInput.ts
│ │ ├── useSpeechSynthesis.ts
│ │ └── useImageUpload.ts
│ │
│ ├── services/ # 비즈니스 로직
│ │ ├── chat.service.ts
│ │ ├── image.service.ts
│ │ ├── quiz.service.ts
│ │ └── auth.service.ts
│ │
│ ├── lib/ # 유틸리티
│ │ ├── ai-providers/
│ │ │ ├── openai.ts
│ │ │ ├── claude.ts
│ │ │ └── gemini.ts
│ │ ├── validators/
│ │ ├── utils.ts
│ │ └── constants.ts
│ │
│ ├── stores/ # 상태 관리 (Zustand)
│ │ ├── chat.store.ts
│ │ ├── settings.store.ts
│ │ └── user.store.ts
│ │
│ └── types/ # TypeScript 타입
│ ├── chat.types.ts
│ ├── image.types.ts
│ └── index.ts
│
├── public/
│ ├── manifest.json # PWA
│ ├── sw.js # Service Worker
│ ├── icons/ # 앱 아이콘
│ └── audio/ # 음성 가이드
│
├── tests/
│ ├── unit/
│ ├── integration/
│ └── e2e/
│
├── docker/
│ ├── Dockerfile
│ ├── Dockerfile.ai
│ └── docker-compose.yml
│
└── docs/
├── prd.md
├── tdd.md
└── ...


### 2.2 상태 관리 전략
```typescript
// Zustand 기반 경량 상태 관리
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  highContrast: boolean;
  voiceEnabled: boolean;
  readingSpeed: number;
  touchTargetSize: 'normal' | 'large';
  setFontSize: (size: SettingsStore['fontSize']) => void;
  toggleHighContrast: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      fontSize: 'large', // 시니어 기본값
      highContrast: false,
      voiceEnabled: true,
      readingSpeed: 0.8, // 느린 속도 기본
      touchTargetSize: 'large',
      setFontSize: (size) => set({ fontSize: size }),
      toggleHighContrast: () => set((state) => ({ highContrast: !state.highContrast })),
    }),
    { name: 'senior-settings' }
  )
);

3. 백엔드 아키텍처
3.1 API Route 설계
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { ChatService } from '@/services/chat.service';

const ChatSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().uuid().optional(),
  context: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20).optional(),
});

export async function POST(request: NextRequest) {
  // Rate Limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const limited = await rateLimit.check(ip, 'chat', 30, 60); // 30회/분
  if (!limited.success) {
    return NextResponse.json(
      { error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
      { status: 429 }
    );
  }

  // 입력 검증
  const body = await request.json();
  const validation = ChatSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: '입력 형식이 올바르지 않습니다.' },
      { status: 400 }
    );
  }

  // AI 처리
  const chatService = new ChatService();
  try {
    const response = await chatService.sendMessage(
      validation.data.message,
      validation.data.sessionId,
      validation.data.context
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'AI 응답을 생성하는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

3.2 AI 서비스 추상화
// lib/ai-providers/base.ts
export interface AIProvider {
  chat(message: string, context?: Message[]): Promise<string>;
  generateImage(prompt: string, options?: ImageOptions): Promise<string>;
  transformImage(image: Buffer, style: string): Promise<Buffer>;
}

// lib/ai-providers/factory.ts
export class AIProviderFactory {
  static create(type: 'chat' | 'image' | 'age'): AIProvider {
    const provider = process.env.AI_PROVIDER || 'openai';
    
    switch (provider) {
      case 'openai':
        return new OpenAIProvider();
      case 'claude':
        return new ClaudeProvider();
      case 'gemini':
        return new GeminiProvider();
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}

4. 데이터 아키텍처
4.1 데이터베이스 스키마
-- 사용자 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- 채팅 세션 테이블
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 채팅 메시지 테이블
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- user, assistant
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 이미지 처리 기록 테이블
CREATE TABLE image_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  original_filename VARCHAR(255),
  transformed_filename VARCHAR(255),
  style VARCHAR(50),
  s3_key VARCHAR(500),
  processing_time INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP -- 자동 삭제
);

-- 퀴즈 진행 테이블
CREATE TABLE quiz_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  quiz_id INTEGER NOT NULL,
  answer TEXT,
  is_correct BOOLEAN,
  completed_at TIMESTAMP DEFAULT NOW()
);

-- 자동 삭제 정책
CREATE POLICY auto_delete_images ON image_records
  USING (expires_at < NOW());

-- 인덱스
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_image_records_user ON image_records(user_id);
CREATE INDEX idx_image_records_expires ON image_records(expires_at);

4.2 Redis 캐싱 전략
// lib/redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const cacheManager = {
  // AI 응답 캐싱 (동일 질문)
  async getCachedChat(hash: string): Promise<string | null> {
    return redis.get(`chat:${hash}`);
  },
  
  async setCachedChat(hash: string, response: string): Promise<void> {
    await redis.setex(`chat:${hash}`, 3600, response); // 1시간
  },
  
  // Rate Limiting
  async checkRateLimit(key: string, limit: number, window: number): Promise<boolean> {
    const current = await redis.incr(`ratelimit:${key}`);
    if (current === 1) {
      await redis.expire(`ratelimit:${key}`, window);
    }
    return current <= limit;
  },
  
  // 세션 관리
  async setSession(sessionId: string, data: object): Promise<void> {
    await redis.setex(`session:${sessionId}`, 7200, JSON.stringify(data));
  }
};

5. PWA (Progressive Web App) 아키텍처
5.1 manifest.json
{
  "name": "AI 배움터",
  "short_name": "AI배움터",
  "description": "시니어를 위한 AI 교육 프로그램",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FAFAFA",
  "theme_color": "#4A90D9",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "categories": ["education"],
  "lang": "ko"
}

5.2 Service Worker 전략
// public/sw.ts
const CACHE_NAME = 'ai-learning-v1';
const STATIC_ASSETS = [
  '/',
  '/chat',
  '/image-transform',
  '/quiz',
  '/icons/icon-192.png',
  '/audio/guide.mp3',
];

// 설치: 핵심 리소스 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// 가져오기: 네트워크 우선, 실패 시 캐시
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

6. 배포 아키텍처
6.1 Docker Compose
version: '3.8'
services:
  web:
    build:
      context: .
      dockerfile: docker/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  ai-service:
    build:
      context: .
      dockerfile: docker/Dockerfile.ai
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=ai_learning
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - web

volumes:
  pgdata:
  redisdata:

  