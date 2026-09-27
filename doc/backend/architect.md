# Technical Architecture (기술 아키텍처)

> 본 문서는 시니어 사용자 디지털 복지 서비스 플랫폼의 상세 기술 아키텍처를 설명합니다.
> Frontend, Backend, 상태 관리, 인증, 콘텐츠 관리, 실시간 동기화, 키오스크 모드, 반응형 시스템을 포함합니다.

---

## 1. Frontend Architecture (프론트엔드 아키텍처)

### 1.1 App Router 구조

```
src/app/
├── layout.tsx              # Root layout: 폰트, ThemeProvider, 전역 Provider, PWA 메타
├── page.tsx                # 메인 페이지 (시니어 대시보드)
├── globals.css             # Tailwind 전역 스타일
├── api/                    # API Routes (Backend)
│   ├── auth/               # 인증 API
│   │   ├── login/route.ts
│   │   ├── logout/route.ts
│   │   └── session/route.ts
│   ├── chat/               # AI 챗봇 API
│   │   └── message/route.ts
│   ├── cms/                # 콘텐츠 관리 API
│   │   ├── contents/route.ts
│   │   └── contents/[id]/route.ts
│   ├── pwa/                # PWA API
│   │   ├── subscribe/route.ts   # 푸시 구독
│   │   └── notify/route.ts      # 알림 발송
│   ├── notifications/      # 알림 API
│   ├── config/             # 설정 API
│   └── admin/              # 관리자 API
│       ├── users/route.ts
│       ├── audit-logs/route.ts
│       ├── permissions/route.ts
│       ├── permissions/[id]/route.ts
│       ├── activity/route.ts
│       ├── notifications/route.ts
│       ├── notifications/[id]/route.ts
│       ├── mock/route.ts
│       └── mock/reset/route.ts
public/
├── sw.js                  # 서비스 워커
├── manifest.json          # PWA 매니페스트
├── offline.html           # 오프라인 폴백 페이지
└── .well-known/
    └── assetlinks.json    # TWA Digital Asset Links
twa/
├── bubblewrap-config.json # TWA 빌드 설정
└── BUILD_GUIDE.md         # TWA 빌드 가이드
```

### 1.2 Client / Server Components 분리 전략

| 구분 | 렌더링 | 예시 |
|------|---------|------|
| **Server Components** | SSR | 레이아웃, 메타데이터, 초기 콘텐츠 로딩 |
| **Client Components** | CSR | 대화형 UI, 폼, 음성 입력, 실시간 챗봇 |
| **Hybrid** | SSR + CSR | 콘텐츠 카드 목록 (SSR 초기 로딩 + CSR 필터링) |

**분리 원칙:**
- `'use client'` 지시어는 상호작용이 필요한 최소 단위에만 적용
- 데이터 fetch는 Server Component에서 수행 (RSC 활용)
- 이벤트 핸들러, useState, useEffect가 필요한 경우만 Client Component

### 1.3 컴포넌트 계층 구조

```
AppProvider (Theme + QueryClient + WebSocket)
├── Header (네비게이션, 알림, 사용자 메뉴)
├── MainContent
│   ├── TabNavigator (시니어 친화적 대형 탭 — 6탭: home/chat/image/future/quiz/settings)
│   ├── ContentArea
│   │   ├── HomeTab (대시보드, 빠른 실행)
│   │   ├── ChatTab (AI 챗봇)
│   │   ├── ImageTab (이미지 생성)
│   │   ├── FutureTab (미래 자아)
│   │   ├── QuizTab (AI 퀴즈)
│   │   └── SettingsTab (접근성 설정)
│   ├── QuickActionBar (자주 쓰는 기능 바로가기)
│   ├── PWAComponents
│   │   ├── PWAInstallBanner (앱 설치 유도)
│   │   ├── OfflineIndicator (온/오프라인 상태)
│   │   ├── PWANotificationManager (푸시 알림)
│   │   └── PWASettingsPanel (PWA 설정)
│   └── AdminSidebar (관리자 — 사이드바에서 접근)
└── Footer (저작권, 접근성 선언)
```

---

## 2. Backend Architecture (백엔드 아키텍처)

### 2.1 API Routes 구조

Next.js App Router의 Route Handlers를 사용하여 RESTful API를 구현합니다.

```
API Route 계층:
Request → Middleware → Validator → Handler → Service → Repository → DB
                                                   ↓
                                              External API (AI)
```

### 2.2 Middleware 체인

```typescript
// 미들웨어 실행 순서
1. corsMiddleware()         // CORS 헤더 설정
2. rateLimitMiddleware()    // 요청 빈도 제한
3. authMiddleware()         // 인증 토큰 검증
4. rbacMiddleware()         // 역할 기반 접근 제어
5. inputValidationMiddleware() // 입력 값 검증
6. promptInjectionMiddleware() // 프롬프트 인젝션 탐지
7. auditLogMiddleware()     // 감사 로그 기록
```

### 2.3 서비스 계층

```typescript
// 비즈니스 로직 계층 구조
AuthService          → 인증, 세션 관리, 토큰 발급
ContentService       → CRUD, 버전 관리, 검색
ChatService          → AI 대화, 컨텍스트 관리, 프롬프트 엔지니어링
AdminService         → 사용자 관리, 권한 부여, 감사 로그
NotificationService  → 알림 생성, 전달, 읽음 처리
AnalyticsService     → 사용량 분석, 통계 수집
```

### 2.4 데이터 접근 계층 (Prisma ORM)

```typescript
// Prisma Client 사용 패턴
import { db } from '@/lib/db';

// 트랜잭션 예시
await db.$transaction(async (tx) => {
  const content = await tx.content.create({ data });
  await tx.auditLog.create({ data: { action: 'content.create' } });
});
```

---

## 3. State Management Architecture (상태 관리 아키텍처)

### 3.1 상태 분류 및 관리 도구

| 상태 유형 | 관리 도구 | 지속성 | 예시 |
|-----------|-----------|--------|------|
| **서버 상태** | TanStack Query | 캐시 TTL | 콘텐츠 목록, 사용자 정보 |
| **클라이언트 상태** | Zustand | 세션 스토리지 | 설정, UI 상태 |
| **URL 상태** | Next.js Router | URL 파라미터 | 활성 탭, 검색어 |
| **폼 상태** | React Hook Form | 메모리 | 로그인 폼, 콘텐츠 작성 |

### 3.2 Zustand Store 아키텍처

```typescript
// Store 구조 (persist middleware 적용)
const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set, get) => ({
      // 상태 및 액션 정의
    }),
    {
      name: 'senior-settings',       // localStorage 키
      partialize: (state) => ({      // 영속화할 상태만 선택
        fontSize: state.fontSize,
        highContrast: state.highContrast,
        ttsEnabled: state.ttsEnabled,
        // 민감 정보는 제외
      }),
    }
  )
);
```

### 3.3 TanStack Query 캐시 전략

```typescript
// 쿼리 키 계층 구조
const queryKeys = {
  contents: {
    all: ['contents'] as const,
    list: (params: ContentsRequest) => ['contents', 'list', params] as const,
    detail: (id: string) => ['contents', 'detail', id] as const,
  },
  admin: {
    users: ['admin', 'users'] as const,
    auditLogs: (params: object) => ['admin', 'auditLogs', params] as const,
  },
};

// staleTime 설정
const cacheConfig = {
  contents: 5 * 60 * 1000,     // 5분 (콘텐츠)
  admin: 2 * 60 * 1000,        // 2분 (관리자 데이터)
  session: 10 * 60 * 1000,     // 10분 (세션)
};
```

---

## 4. Authentication Flow (인증 흐름)

### 4.1 로그인 시퀀스 다이어그램

```
Client                    Server                    Session Store
  │                         │                           │
  │── POST /api/auth/login ──→│                           │
  │   {username, password}  │                           │
  │                         │── bcrypt.compare() ───────→│
  │                         │   (password hash 검증)    │
  │                         │                           │
  │                         │── 세션 생성 ──────────────→│
  │                         │   {sessionId, userId,     │
  │                         │    expiresAt, role}       │
  │                         │                           │
  │←─ {token, user, exp} ───│                           │
  │                         │                           │
  │── 이후 요청 시 ──────────→│                           │
  │   Authorization:        │── 세션 검증 ──────────────→│
  │   Bearer <token>        │                           │
```

### 4.2 세션 관리

- **저장소**: In-memory Map (서버 재시작 시 세션 초기화)
- **TTL**: 24시간 (설정 가능)
- **토큰 형식**: 암호화된 세션 ID (HMAC-SHA256 서명)
- **자동 갱신**: 활동 시 세션 만료 시간 연장
- **동시 세션**: 사용자당 최대 3개 세션 허용

### 4.3 인증 미들웨어

```typescript
async function authMiddleware(request: Request): Promise<AuthResult> {
  const token = extractBearerToken(request);
  if (!token) return { authenticated: false, error: 'NO_TOKEN' };

  const session = sessionStore.get(token);
  if (!session) return { authenticated: false, error: 'INVALID_TOKEN' };

  if (Date.now() > session.expiresAt) {
    sessionStore.delete(token);
    return { authenticated: false, error: 'TOKEN_EXPIRED' };
  }

  // 활동 시 세션 연장
  session.expiresAt = Date.now() + SESSION_TTL;
  return { authenticated: true, user: session.user };
}
```

---

## 5. Content Management Flow (콘텐츠 관리 흐름)

### 5.1 콘텐츠 수명 주기

```
작성(draft) → 검토(review) → 승인(approved) → 게시(published) → 보관(archived)
```

### 5.2 버전 관리 시스템

```typescript
// 콘텐츠 수정 시 새 버전 자동 생성
async function updateContent(id: string, data: Partial<ContentItem>) {
  const current = await db.content.findUnique({ where: { id } });

  // 이전 버전을 버전 테이블에 저장
  await db.contentVersion.create({
    data: {
      contentId: id,
      version: current.version,
      title: current.title,
      body: current.body,
      snapshot: current,      // 전체 스냅샷
    },
  });

  // 현재 콘텐츠 업데이트 (버전 증가)
  return db.content.update({
    where: { id },
    data: { ...data, version: { increment: 1 } },
  });
}
```

### 5.3 AI 기반 콘텐츠 보강

```
사용자 질문 → 의도 분석 → 관련 콘텐츠 검색 → 컨텍스트 구성 → AI 응답 생성 → 출처 표시
```

---

## 6. Real-time Sync Architecture (실시간 동기화 아키텍처)

### 6.1 WebSocket 아키텍처

```
Client (Socket.io Client)
    ↕ WebSocket (/?XTransformPort=3003)
Gateway (Caddy)
    ↕ Proxy
Socket.io Server (Mini Service, Port 3003)
    ↕
Event Bus (In-process)
```

### 6.2 이벤트 흐름

```typescript
// 콘텐츠 업데이트 실시간 반영
1. 관리자가 콘텐츠 수정
2. API Route에서 Socket.io 서비스에 이벤트 발행
3. Socket.io 서버가 구독 클라이언트에 브로드캐스트
4. 클라이언트가 TanStack Query 캐시 무효화
5. UI가 자동 업데이트

// 채팅 타이핑 표시기
1. 사용자가 텍스트 입력 시작
2. Client → Server: { type: 'chat.typing', sessionId }
3. Server → Other Clients: { type: 'chat.typing', userId }
```

### 6.3 연결 관리

- **재연결**: 자동 재연결 (최대 5회, 지수 백오프)
- **하트비트**: 25초 간격 ping/pong
- **방 관리**: 사용자 역할별 채널 분리 (`admin:`, `user:`)

---

## 7. Kiosk Mode Detection (키오스크 모드 탐지)

### 7.1 탐지 방식

```typescript
function detectKioskMode(): KioskInfo {
  const params = new URLSearchParams(window.location.search);
  const isKioskParam = params.get('kiosk') === 'true';
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const hasNoMouse = !window.matchMedia('(pointer: fine)').matches;
  const isLargeScreen = window.innerWidth >= 1920;

  return {
    isKiosk: isKioskParam || (isStandalone && hasNoMouse),
    screenSize: detectKioskScreenSize(),    // '21inch' | '32inch'
    orientation: screen.orientation.type,
    touchOnly: hasNoMouse,
  };
}
```

### 7.2 키오스크 모드 설정

| 설정 | 일반 모드 | 키오스크 모드 |
|------|-----------|---------------|
| 폰트 크기 | 16px 기본 | 24px 기본 |
| 터치 타겟 | 44px | 64px |
| 세션 타임아웃 | 24시간 | 15분 비조작 시 자동 로그아웃 |
| 네비게이션 | 탭 + 사이드바 | 전체 화면 탭만 |
| 뒤로가기 | 브라우저 버튼 | 화면 내 대형 버튼 |
| 키보드 | 가상 키보드 | 내장 가상 키보드 |

---

## 8. Responsive Breakpoint System (반응형 브레이크포인트 시스템)

### 8.1 브레이크포인트 정의

```css
/* Tailwind 설정 (커스텀 브레이크포인트) */
breakpoints: {
  'xs': '360px',       /* 소형 모바일 */
  'sm': '640px',       /* 대형 모바일 */
  'md': '768px',       /* 태블릿 (세로) */
  'lg': '1024px',      /* 태블릿 (가로) / 소형 노트북 */
  'xl': '1280px',      /* 데스크톱 */
  '2xl': '1536px',     /* 대형 데스크톱 */
  'kiosk-sm': '1920px', /* 키오스크 21인치 */
  'kiosk-lg': '3840px', /* 키오스크 32인치 (4K) */
}
```

### 8.2 반응형 레이아웃 전략

```
xs-sm (모바일):    단일 컬럼, 하단 탭 네비게이션
md (태블릿 세로):  단일 컬럼 + 사이드 드로어
lg (태블릿 가로):  2컬럼 레이아웃, 사이드바 네비게이션
xl-2xl (데스크톱): 3컬럼 레이아웃, 고정 사이드바
kiosk-sm:          최적화된 키오스크 레이아웃, 대형 터치 타겟
kiosk-lg:          4K 최적화, 초대형 폰트 및 버튼
```

### 8.3 CSS 커스텀 프로퍼티 (동적 스케일링)

```css
:root {
  --font-scale: 1;           /* 기본 스케일 */
  --touch-target: 44px;      /* 최소 터치 타겟 */
  --spacing-unit: 4px;       /* 간격 단위 */
}

[data-font-size="large"] {
  --font-scale: 1.25;
  --touch-target: 52px;
}

[data-font-size="xlarge"] {
  --font-scale: 1.5;
  --touch-target: 56px;
}

[data-font-size="xxlarge"] {
  --font-scale: 1.75;
  --touch-target: 64px;
}

[data-kiosk="true"] {
  --font-scale: 1.5;
  --touch-target: 64px;
}
```

---

## 9. 배포 아키텍처

```
┌─────────────────────────────────────────────┐
│              Caddy Gateway (:80/:443)        │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │  Next.js    │  │  Mini Services       │  │
│  │  (:3000)    │  │  Socket.io (:3003)   │  │
│  │             │  │  Analytics (:3004)   │  │
│  └─────────────┘  └──────────────────────┘  │
│                      ↓                       │
│              ┌──────────────┐                │
│              │  SQLite DB   │                │
│              └──────────────┘                │
│                                              │
│  PWA Layer:                                  │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ Service     │  │ Web App Manifest     │  │
│  │ Worker      │  │ + PWA Meta Tags      │  │
│  │ (sw.js)     │  │ (manifest.json)      │  │
│  └─────────────┘  └──────────────────────┘  │
│                                              │
│  TWA Layer:                                  │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ Digital     │  │ Bubblewrap Config    │  │
│  │ Asset Links │  │ (kr.ai.platform.twa) │  │
│  └─────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

*최종 업데이트: 2025-08-12 | 버전: 2.1.0*
