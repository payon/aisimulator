# ARCHITECT.MD — 아키텍처 설계 문서

## AI Platform Backend Admin Dashboard

---

## 1. 시스템 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │ HomePage  │  │ Admin    │  │ Settings │  │ AI Features       │   │
│  │ (시니어)  │  │ Dashboard│  │ Panel    │  │ Chat/Quiz/Image   │   │
│  └─────┬────┘  └────┬─────┘  └────┬─────┘  └────────┬──────────┘   │
│        │            │             │                  │               │
│  ┌─────┴────────────┴─────────────┴──────────────────┴──────────┐   │
│  │              Zustand Store + TanStack Query                   │   │
│  └─────────────────────────┬────────────────────────────────────┘   │
│                            │ fetch / WebSocket                      │
└────────────────────────────┼───────────────────────────────────────┘
                             │
┌────────────────────────────┼───────────────────────────────────────┐
│                    Caddy Gateway (Port 3000)                        │
│  ┌─────────────────────────┴────────────────────────────────────┐  │
│  │  Route: /api/*        → Next.js API Routes (Port 3000)      │  │
│  │  Route: /socket.io/*  → Mini Service (Port 3003)            │  │
│  │  Query: XTransformPort → Port Override                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬───────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────┴────────┐ ┌───────┴───────┐ ┌────────┴────────┐
│  Next.js 16      │ │  Mini Service │ │  Static Assets  │
│  App Router      │ │  Socket.io    │ │  (CDN/Local)    │
│  (Port 3000)     │ │  (Port 3003)  │ │                 │
│                  │ │               │ │                 │
│ ┌──────────────┐ │ │ ┌───────────┐ │ │                 │
│ │ API Routes    │ │ │ │ WebSocket │ │ │                 │
│ │ /api/*        │ │ │ │ Handler   │ │ │                 │
│ └──────┬───────┘ │ │ └─────┬─────┘ │ │                 │
│        │         │ │       │       │ │                 │
│ ┌──────┴───────┐ │ │ ┌─────┴─────┐ │ │                 │
│ │ Server Libs  │ │ │ │ Event     │ │ │                 │
│ │ - admin-auth │ │ │ │ Emitter   │ │ │                 │
│ │ - ai-provider│ │ │ └───────────┘ │ │                 │
│ │ - rate-limit │ │ │               │ │                 │
│ │ - audit      │ │ │               │ │                 │
│ │ - security   │ │ │               │ │                 │
│ └──────┬───────┘ │ │               │ │                 │
│        │         │ │               │ │                 │
│ ┌──────┴───────┐ │ │               │ │                 │
│ │ Prisma ORM   │ │ │               │ │                 │
│ │ (SQLite/PG)  │ │ │               │ │                 │
│ └──────┬───────┘ │ │               │ │                 │
└────────┼─────────┘ └───────────────┘ └─────────────────┘
         │
┌────────┴─────────────────────────────────────────────────────────┐
│                    Database Layer                                 │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐  │
│  │ SQLite (Dev)      │  │ PostgreSQL (Production)              │  │
│  │ - 단일 파일 DB   │  │ - 확장 가능한 관계형 DB              │  │
│  │ - 로컬 개발용    │  │ - 마이그레이션 통해 전환             │  │
│  └──────────────────┘  └──────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. 기술 스택 (Technology Stack)

### 2.1 프레임워크 & 언어

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16 | App Router 기반 Fullstack Framework |
| TypeScript | 5 | 정적 타입 검증, 개발 생산성 |
| React | 19 | UI 컴포넌트 렌더링 |
| Tailwind CSS | 4 | Utility-first 스타일링 |

### 2.2 데이터베이스 & ORM

| 기술 | 버전 | 용도 |
|------|------|------|
| Prisma | 최신 | ORM, Schema 마이그레이션 |
| SQLite | - | 개발 환경 로컬 DB |
| PostgreSQL | 16+ | 프로덕션 환경 DB |

### 2.3 UI 라이브러리

| 기술 | 용도 |
|------|------|
| shadcn/ui (New York) | 공통 UI 컴포넌트 (Button, Card, Dialog 등) |
| Lucide Icons | 아이콘 라이브러리 |
| Framer Motion | 애니메이션 |
| next-themes | 다크/라이트 모드 |

### 2.4 상태 관리 & 통신

| 기술 | 용도 |
|------|------|
| Zustand | 클라이언트 전역 상태 관리 |
| TanStack Query | 서버 상태 캐싱 및 동기화 |
| Socket.io | 실시간 양방향 통신 |
| Zod | 런타임 스키마 검증 |

### 2.5 인증 & 보안

| 기술 | 용도 |
|------|------|
| NextAuth.js v4 | 세션 인증 |
| JWT | 토큰 기반 인증 |
| bcrypt | 비밀번호 해싱 |

---

## 3. 컴포넌트 계층 구조 (Component Hierarchy)

```
App (layout.tsx)
├── ThemeProvider
├── QueryClientProvider
└── Page (page.tsx)
    ├── HomePage
    │   ├── SeniorOnboarding (초기 설정 가이드)
    │   ├── SeniorGuideTour (스텝 가이드 투어)
    │   ├── QuickActionBar (빠른 액션)
    │   ├── ChatPanel (AI 채팅)
    │   ├── ImagePanel (이미지 생성)
    │   ├── QuizPanel (퀴즈)
    │   ├── FutureMePanel (미래 자아)
    │   ├── SettingsPanel (설정)
    │   └── AccessibilityPanel (접근성)
    ├── AdminPanel (사이드바)
    │   ├── AdminLogin (관리자 인증)
    │   └── AdminDashboard
    │       ├── UserManager (사용자 관리)
    │       ├── ContentManager (콘텐츠 관리)
    │       ├── RoleManager (역할/권한 관리)
    │       ├── AuditLogViewer (감사 로그)
    │       └── SiteConfigEditor (사이트 설정)
    ├── NotificationSystem (알림 시스템)
    ├── PWAComponents
    │   ├── PWAInstallBanner (앱 설치 유도)
    │   ├── OfflineIndicator (오프라인 표시)
    │   ├── PWANotificationManager (푸시 알림)
    │   └── PWASettingsPanel (PWA 설정)
    ├── MockModeIndicator (Mock 모드 표시)
    └── MockDataManager (Mock 데이터 관리)
```

---

## 4. 데이터 흐름 (Data Flow)

### 4.1 요청 흐름 (Request Flow)

```
사용자 액션 → Zustand Action → TanStack Query Mutation
    → fetch(/api/endpoint) → Caddy Gateway
    → Next.js API Route → 미들웨어 (인증/권한/Rate Limit)
    → Service Logic → Prisma Query → Database
    → Response → Query Cache 업데이트 → UI 리렌더
```

### 4.2 실시간 흐름 (Real-time Flow)

```
서버 이벤트 발생 → Socket.io Emitter (Port 3003)
    → Caddy Gateway → Client Socket Listener
    → Zustand Store 업데이트 → UI 반영
    → Toast/알림 표시
```

### 4.3 인증 흐름 (Auth Flow)

```
로그인 요청 → /api/admin/auth (POST)
    → bcrypt 비밀번호 검증
    → JWT 토큰 생성 (HttpOnly Cookie)
    → 세션 정보 Zustand 저장
    → 이후 요청 시 Cookie 자동 첨부
    → 미들웨어에서 토큰 검증 + 권한 확인
```

---

## 5. Admin 분리 설계 (Admin Separation Design)

### 5.1 아키텍처 원칙

| 원칙 | 설명 |
|------|------|
| 경로 분리 | `/api/admin/*` 경로로 관리 API 완전 분리 |
| 인증 분리 | 일반 사용자 세션과 관리자 세션 독립 관리 |
| 컴포넌트 분리 | `src/components/admin/` 디렉토리로 UI 분리 |
| 권한 분리 | 관리자 전용 RBAC 미들웨어 적용 |
| 감사 분리 | 관리 액션만 감사 로그에 기록 |

### 5.2 Admin API 미들웨어 체인

```
요청 → CORS 검증 → Rate Limit → 인증 토큰 검증
    → 관리자 권한 확인 → 감사 로그 기록 → 핸들러 실행
```

### 5.3 일반 사용자 vs 관리자 분리

| 영역 | 일반 사용자 | 관리자 |
|------|-------------|--------|
| 경로 | `/api/chat`, `/api/image` 등 | `/api/admin/*` |
| 인증 | 세션 기반 (선택) | JWT 강제 인증 |
| 권한 | 기본 접근 | RBAC 세분화 |
| 감사 | 미기록 | 모든 액션 기록 |
| Rate Limit | 100/min | 200/min |

---

## 6. 실시간 동기화 메커니즘 (Real-time Sync)

### 6.1 WebSocket 아키텍처

```
Client                     Caddy                   Mini Service
  │                          │                         │
  │── io("/?XTransformPort=3003") ──→│── ws://localhost:3003 ──→│
  │                          │                         │
  │←── event: notification ───│←── broadcast ───────────│
  │←── event: config_update ──│←── emit ────────────────│
  │←── event: user_update ────│←── emit ────────────────│
```

### 6.2 이벤트 타입

| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `notification` | Server → Client | 새 알림 푸시 |
| `config_update` | Server → Client | 사이트 설정 변경 알림 |
| `user_update` | Server → Client | 사용자 정보 변경 알림 |
| `content_update` | Server → Client | 콘텐츠 변경 알림 |
| `role_update` | Server → Client | 권한 변경 알림 |
| `ping` | Client → Server | 연결 유지 확인 |
| `pong` | Server → Client | 연결 유지 응답 |

### 6.3 재연결 전략

```typescript
// Socket.io 재연결 설정
const socketOptions = {
  reconnection: true,
  reconnectionAttempts: 10,        // 최대 10회 시도
  reconnectionDelay: 1000,          // 초기 1초 대기
  reconnectionDelayMax: 30000,      // 최대 30초 대기
  reconnectionJitter: 500,          // 지터 500ms
  timeout: 20000,                   // 연결 타임아웃 20초
};
```

---

## 7. 캐싱 전략 (Caching Strategy)

### 7.1 캐시 계층

```
요청 → 브라우저 캐시 (Service Worker)
     → TanStack Query 캐시 (메모리)
     → 서버 메모리 캐시 (Map/LRU)
     → Database 쿼리 캐시 (Prisma)
     → Database
```

### 7.2 TanStack Query 캐시 설정

| 데이터 유형 | Stale Time | Cache Time | Refetch 정책 |
|-------------|------------|------------|--------------|
| 사용자 정보 | 5분 | 30분 | 창 포커스 시 |
| 콘텐츠 목록 | 2분 | 10분 | 창 포커스 시 |
| 감사 로그 | 30초 | 5분 | 폴링 30초 |
| 사이트 설정 | 10분 | 60분 | 수동 갱신 |
| 통계 데이터 | 1분 | 5분 | 폴링 60초 |
| 알림 목록 | 10초 | 2분 | 실시간 + 폴링 |

### 7.3 서버 사이드 메모리 캐시

```typescript
// LRU 캐시 구현 (Rate Limit 및 설정 캐시)
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  
  get(key: string): T | null;    // 캐시 조회
  set(key: string, value: T, ttlMs: number): void;  // 캐시 저장
  delete(key: string): void;     // 캐시 무효화
  clear(): void;                 // 전체 캐시 초기화
}
```

### 7.4 캐시 무효화 전략

| 트리거 | 무효화 범위 |
|--------|-------------|
| 콘텐츠 수정 | `content.*` 키 패턴 |
| 사용자 정보 변경 | `user.{id}`, `users.list` |
| 권한 변경 | `roles.*`, `permissions.*`, `user.{id}` |
| 설정 변경 | `config.*` + WebSocket 브로드캐스트 |
| AI Provider 변경 | `ai.providers`, `ai.status` |

---

## 8. 에러 처리 아키텍처

### 8.1 에러 계층

```
클라이언트 에러 → Toast 알림 (시니어 친화적 메시지)
    ↑
API 에러 응답 → 표준화된 에러 포맷
    ↑
서비스 에러 → 로깅 + 분류
    ↑
DB 에러 → Prisma 에러 래핑
```

### 8.2 표준 에러 응답

```typescript
interface ApiError {
  code: string;        // "AUTH_REQUIRED" | "FORBIDDEN" | "NOT_FOUND" | ...
  message: string;     // 사용자 친화적 한국어 메시지
  detail?: string;     // 개발자용 상세 정보
  timestamp: string;   // ISO 8601
}
```

---

## 9. 배포 아키텍처

```
개발 (Development)
├── SQLite (로컬 파일)
├── Next.js Dev Server (Port 3000)
├── Socket.io (Port 3003)
└── Hot Reload 활성

프로덕션 (Production)
├── PostgreSQL (외부 DB)
├── Next.js Standalone Build
├── Socket.io (별도 프로세스)
├── Caddy 리버스 프록시
└── CDN (정적 에셋)
```

---

## 10. 디렉토리 구조

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts
│   │   ├── image/route.ts
│   │   ├── quiz/route.ts
│   │   ├── future-self/route.ts
│   │   ├── settings/route.ts
│   │   ├── cms/content/route.ts
│   │   ├── notifications/route.ts
│   │   ├── config/route.ts
│   │   ├── pwa/
│   │   │   ├── subscribe/route.ts    # PWA 푸시 구독
│   │   │   └── notify/route.ts        # PWA 알림 발송
│   │   └── admin/
│   │       ├── auth/route.ts
│   │       ├── users/route.ts
│   │       ├── content/[key]/route.ts
│   │       ├── roles/route.ts
│   │       ├── permissions/[id]/route.ts
│   │       ├── config/route.ts
│   │       ├── audit/route.ts
│   │       ├── stats/route.ts
│   │       ├── notifications/route.ts
│   │       ├── notifications/[id]/route.ts
│   │       ├── activity/route.ts
│   │       ├── mock/route.ts
│   │       └── mock/reset/route.ts
│   ├── layout.tsx              # PWA 메타 태그 포함
│   └── page.tsx
├── components/
│   ├── ui/                    (shadcn/ui)
│   ├── features/              (사용자 기능 + PWA 컴포넌트)
│   │   ├── PWAInstallBanner.tsx
│   │   ├── OfflineIndicator.tsx
│   │   ├── PWANotificationManager.tsx
│   │   ├── PWASettingsPanel.tsx
│   │   ├── SeniorGuideTour.tsx
│   │   ├── MockModeIndicator.tsx
│   │   └── MockDataManager.tsx
│   └── admin/                 (관리자 기능)
├── lib/                       (서버 사이드 로직)
├── hooks/                     (커스텀 훅)
│   ├── use-hydrated.ts        (SSR hydration 안전성)
│   ├── use-pwa.ts             (PWA 기능)
│   ├── use-mock-mode.ts       (Mock 모드)
│   └── use-toast.ts           (Toast)
├── stores/                    (Zustand 스토어)
│   └── use-pwa-store.ts       (PWA 상태)
├── types/                     (TypeScript 타입)
└── public/
    ├── sw.js                  (서비스 워커)
    ├── manifest.json          (PWA 매니페스트)
    ├── offline.html           (오프라인 페이지)
    └── .well-known/
        └── assetlinks.json    (TWA Digital Asset Links)
twa/
├── bubblewrap-config.json     (TWA 설정)
└── BUILD_GUIDE.md             (TWA 빌드 가이드)
```
