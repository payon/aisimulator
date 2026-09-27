# Architect (아키텍처 문서)

## AI 플랫폼 관리자 대시보드 시스템 아키텍처

| 항목 | 내용 |
|------|------|
| 버전 | 2.1.0 |
| 작성일 | 2025-08-12 |

---

## 1. 아키텍처 스타일

**단일 페이지 애플리케이션 (SPA) + 서버 사이드 API + 관리자 대시보드 + PWA**

- 프론트엔드: React SPA (AI 플랫폼 사용자용) + Admin SPA (관리자용)
- 백엔드: Next.js API Routes (공개 AI API + 보호된 관리 API)
- 인증: Bearer 토큰 + 인메모리 세션 스토어
- 데이터: SQLite + Prisma ORM (13개 모델)
- CMS: 키-값 기반 콘텐츠 저장 + 공개 API + 클라이언트 캐시
- PWA: Service Worker + Web App Manifest + 푸시 알림 + 오프라인 지원
- TWA: Digital Asset Links + Bubblewrap 래핑 (Android 앱)
- 게이트웨이: Caddy 리버스 프록시

---

## 2. 레이어드 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                   Presentation Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  AI Platform  │  │Admin Dashboard│  │   Animations     │  │
│  │  (6 tabs)    │  │  (6 tabs)    │  │ (Framer Motion)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                     State Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Zustand     │  │  CMS Cache   │  │   Local State    │  │
│  │ (admin-store │  │(useCmsContent│  │   (useState)     │  │
│  │  pwa-store   │  │              │  │                  │  │
│  │  guide-store │  │              │  │                  │  │
│  │  a11y-store) │  │              │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      PWA Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Service     │  │  Web App     │  │  Push/Cache      │  │
│  │  Worker      │  │  Manifest    │  │  (use-pwa)       │  │
│  │  (sw.js)     │  │(manifest.json│  │  (4-tier cache)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │  PWA Comps   │  │  Hydration   │                         │
│  │ (Banner,     │  │  Safety      │                         │
│  │  Offline,    │  │(useClientVal)│                         │
│  │  Notif,      │  │(useHydrated) │                         │
│  │  Settings)   │  │              │                         │
│  └──────────────┘  └──────────────┘                         │
├─────────────────────────────────────────────────────────────┤
│                      API Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  /api/*      │  │ /api/admin/* │  │  /api/cms/*      │  │
│  │  (공개 AI)   │  │  (보호됨)    │  │   (공개 CMS)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ /api/pwa/*   │  │/api/notifs   │  │  /api/config     │  │
│  │ (PWA 푸시)   │  │ (알림)      │  │   (사이트 설정)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                  Authentication Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Sessions    │  │  RBAC        │  │   Audit Logger   │  │
│  │ (In-Memory)  │  │(Permissions) │  │  (logAction)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Provider Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │AI Provider   │  │  bcrypt      │  │   Rate Limiter   │  │
│  │Abstraction   │  │ (Password)   │  │   (In-Memory)    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                     Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │   Prisma     │  │   SQLite     │                         │
│  │   (ORM)      │  │  (DB File)   │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 모듈 의존성 그래프

```
page.tsx
├── @/components/features/*       # AI 플랫폼 프론트엔드
│   ├── ChatPanel → @/hooks/use-voice, @/hooks/use-cms-content, @/hooks/use-hydrated
│   ├── ImagePanel → @/hooks/use-cms-content
│   ├── FutureMePanel → @/hooks/use-cms-content
│   ├── QuizPanel → @/hooks/use-cms-content
│   ├── SettingsPanel (독립)
│   ├── HomePage → @/hooks/use-cms-content
│   ├── SeniorGuideTour → @/stores/useGuideTourStore
│   └── MockModeIndicator → @/hooks/use-mock-mode
├── @/components/pwa/*            # PWA 컴포넌트
│   ├── PWAInstallBanner → @/hooks/use-pwa, @/hooks/use-hydrated
│   ├── OfflineIndicator → @/hooks/use-pwa
│   ├── PWANotificationManager → @/hooks/use-pwa, @/hooks/use-hydrated
│   └── PWASettingsPanel → @/hooks/use-pwa, @/stores/usePWAStore
├── @/components/admin/*          # 관리자 대시보드
│   ├── AdminPanel → admin-store, use-admin-auth
│   ├── AdminLogin → admin-store
│   ├── AdminDashboard → /api/admin/stats
│   ├── ContentManager → /api/admin/content
│   ├── UserManager → /api/admin/users
│   ├── RoleManager → /api/admin/roles
│   ├── AuditLogViewer → /api/admin/audit
│   ├── SiteConfigEditor → /api/admin/config
│   └── MockDataManager → /api/admin/mock
├── @/stores
│   ├── admin-store → localStorage (토큰·사용자 정보)
│   ├── usePWAStore → install/SW/push/online 상태
│   ├── useGuideTourStore → 가이드 투어 진행 상태
│   ├── useAccessibilityPanelStore → 접근성 패널 상태
│   └── index.ts (기존 스토어)
├── @/hooks
│   ├── use-admin-auth → admin-store, /api/admin/auth, @/hooks/use-hydrated
│   ├── use-cms-content → /api/cms/content (30s 캐시)
│   ├── use-pwa → /api/pwa/subscribe, /api/pwa/notify, navigator.serviceWorker
│   ├── use-hydrated → useSyncExternalStore (SSR hydration safety)
│   ├── use-voice → @/hooks/use-hydrated (TTS/STT)
│   ├── use-mock-mode → mock 모드 감지
│   ├── use-toast → 토스트 알림
│   └── use-mobile
└── @/types

API Routes:
├── /api/chat → @/lib/ai-provider, @/lib/rate-limit, @/lib/security
├── /api/image → @/lib/ai-provider, @/lib/rate-limit
├── /api/future-self → @/lib/ai-provider, @/lib/rate-limit
├── /api/quiz → @/lib/ai-provider, @/lib/rate-limit
├── /api/settings → @/lib/db
├── /api/config → @/lib/db (공개, 사이트 설정)
├── /api/notifications → @/lib/db (공개, 알림)
├── /api/pwa/subscribe → web-push (푸시 구독)
├── /api/pwa/notify → web-push (푸시 발송)
├── /api/admin/auth → @/lib/admin-auth, @/lib/audit, @/lib/db
├── /api/admin/content → @/lib/admin-auth, @/lib/audit, @/lib/db
├── /api/admin/content/[key] → @/lib/admin-auth, @/lib/audit, @/lib/db
├── /api/admin/users → @/lib/admin-auth, @/lib/audit, @/lib/db
├── /api/admin/roles → @/lib/admin-auth, @/lib/audit, @/lib/db
├── /api/admin/audit → @/lib/admin-auth, @/lib/db
├── /api/admin/config → @/lib/admin-auth, @/lib/audit, @/lib/db
├── /api/admin/stats → @/lib/admin-auth, @/lib/db
├── /api/admin/permissions → @/lib/admin-auth, @/lib/db
├── /api/admin/permissions/[id] → @/lib/admin-auth, @/lib/db
├── /api/admin/activity → @/lib/admin-auth, @/lib/db
├── /api/admin/notifications → @/lib/admin-auth, @/lib/db
├── /api/admin/notifications/[id] → @/lib/admin-auth, @/lib/db
├── /api/admin/mock → @/lib/admin-auth, @/lib/db
├── /api/admin/mock/reset → @/lib/admin-auth, @/lib/db
└── /api/cms/content → @/lib/db (공개, 인증 불필요)
```

---

## 4. 디렉토리 구조

```
src/
├── app/
│   ├── layout.tsx                # 루트 레이아웃 (PWA meta tags)
│   ├── page.tsx                  # 메인 SPA 페이지 (6 tabs + admin sidebar)
│   ├── globals.css               # 전역 스타일
│   └── api/
│       ├── chat/route.ts         # 채팅 API
│       ├── image/route.ts        # 이미지 변환 API
│       ├── future-self/route.ts  # 미래 모습 API
│       ├── quiz/route.ts         # 퀴즈 API
│       ├── settings/route.ts     # 설정 API
│       ├── config/route.ts       # 사이트 설정 공개 API
│       ├── notifications/route.ts # 공개 알림 API
│       ├── pwa/                  # 📱 PWA API
│       │   ├── subscribe/route.ts  # 푸시 구독
│       │   └── notify/route.ts     # 푸시 발송
│       ├── admin/                # 🔒 관리자 API (인증 필요)
│       │   ├── auth/route.ts     #   로그인/로그아웃/세션
│       │   ├── content/route.ts  #   콘텐츠 CRUD
│       │   ├── content/[key]/route.ts  # 단일 콘텐츠
│       │   ├── users/route.ts    #   사용자 관리
│       │   ├── roles/route.ts    #   권한 관리
│       │   ├── permissions/route.ts    #   권한 목록
│       │   ├── permissions/[id]/route.ts  # 단일 권한
│       │   ├── audit/route.ts    #   감사 로그
│       │   ├── config/route.ts   #   사이트 설정
│       │   ├── stats/route.ts    #   대시보드 통계
│       │   ├── activity/route.ts #   사용자 활동
│       │   ├── notifications/route.ts    #   관리자 알림
│       │   ├── notifications/[id]/route.ts  # 단일 알림
│       │   ├── mock/route.ts     #   Mock 데이터 관리
│       │   └── mock/reset/route.ts  # Mock 데이터 초기화
│       └── cms/                  # 🌐 공개 CMS API
│           └── content/route.ts  #   콘텐츠 조회 (인증 불필요)
├── components/
│   ├── features/                 # AI 플랫폼 기능 컴포넌트
│   │   ├── HomePage.tsx
│   │   ├── ChatPanel.tsx
│   │   ├── ImagePanel.tsx
│   │   ├── FutureMePanel.tsx
│   │   ├── QuizPanel.tsx
│   │   ├── SettingsPanel.tsx
│   │   ├── SeniorGuideTour.tsx   # 시니어 가이드 투어
│   │   └── MockModeIndicator.tsx # Mock 모드 표시기
│   ├── pwa/                      # 📱 PWA 컴포넌트
│   │   ├── PWAInstallBanner.tsx  #   설치 배너
│   │   ├── OfflineIndicator.tsx  #   오프라인 표시기
│   │   ├── PWANotificationManager.tsx  # 알림 관리
│   │   └── PWASettingsPanel.tsx  #   PWA 설정 패널
│   ├── admin/                    # 관리자 대시보드 컴포넌트
│   │   ├── AdminPanel.tsx        #   메인 컨테이너
│   │   ├── AdminLogin.tsx        #   로그인 폼
│   │   ├── AdminDashboard.tsx    #   대시보드 통계
│   │   ├── ContentManager.tsx    #   콘텐츠 관리
│   │   ├── UserManager.tsx       #   사용자 관리
│   │   ├── RoleManager.tsx       #   권한 관리
│   │   ├── AuditLogViewer.tsx    #   감사 로그
│   │   ├── SiteConfigEditor.tsx  #   사이트 설정
│   │   └── MockDataManager.tsx   #   Mock 데이터 관리
│   └── ui/                       # shadcn/ui 컴포넌트
├── hooks/
│   ├── use-admin-auth.ts         # 관리자 인증 훅 (hydration-safe)
│   ├── use-cms-content.ts        # CMS 콘텐츠 훅 (30s 캐시)
│   ├── use-pwa.ts                # PWA 훅 (install, SW, push, cache, online)
│   ├── use-hydrated.ts           # Hydration 안전 훅 (useClientValue, useHydrated)
│   ├── use-voice.ts              # TTS/STT 훅 (hydration-safe)
│   ├── use-mock-mode.ts          # Mock 모드 감지 훅
│   ├── use-toast.ts              # 토스트 알림 훅
│   └── use-mobile.ts             # 모바일 감지 훅
├── lib/
│   ├── admin-auth.ts             # 세션 스토어 + RBAC
│   ├── audit.ts                  # 감사 로그 헬퍼
│   ├── ai-provider.ts            # AI 제공자 추상화
│   ├── db.ts                     # Prisma 클라이언트
│   ├── prompts.ts                # 시스템 프롬프트
│   ├── rate-limit.ts             # Rate Limiting
│   ├── security.ts               # 보안 유틸리티
│   └── utils.ts                  # 공통 유틸리티
├── stores/
│   ├── admin-store.ts            # 관리자 상태 (Zustand)
│   ├── usePWAStore.ts            # PWA 상태 (Zustand)
│   ├── useGuideTourStore.ts      # 가이드 투어 상태 (Zustand)
│   ├── useAccessibilityPanelStore.ts  # 접근성 패널 상태 (Zustand)
│   └── index.ts                  # 기존 스토어
├── types/
│   └── index.ts                  # TypeScript 타입 정의
├── twa/                           # 🤖 TWA (Android 앱 래핑)
│   ├── bubblewrap-config.json    #   Bubblewrap 설정
│   └── BUILD_GUIDE.md            #   빌드 가이드
└── public/
    ├── sw.js                      # Service Worker (4-tier cache)
    ├── manifest.json              # Web App Manifest
    └── .well-known/
        └── assetlinks.json        # Digital Asset Links (TWA)
```

---

## 5. 디자인 결정 사항

### 5.1 인메모리 세션 스토어
**결정**: `Map<string, Session>` 기반 인메모리 세션
**이유**: 외부 의존성(Redis) 불필요, 단일 인스턴스에 적합, 구현 단순
**트레이드오프**: 서버 재시작 시 모든 세션 초기화, 다중 인스턴스 불가

### 5.2 CMS 키-값 패턴
**결정**: Content 모델에 `key`(고유) + `category` + `type` + `value` 구조
**이유**: 유연한 콘텐츠 관리, 프론트엔드에서 키로 즉시 조회, 카테고리 필터링
**트레이드오프**: 관계형 구조가 아닌 키-값 패턴으로 복잡 콘텐츠는 JSON value 사용

### 5.3 Bearer 토큰 (UUID) 방식
**결정**: `crypto.randomUUID()`로 세션 토큰 생성, JWT 미사용
**이유**: 구현 단순, 서버에서 세션 무효화 가능, 토큰 탈취 시 즉시 삭제 가능
**트레이드오프**: 다중 서버 환경에서 세션 공유 불가 (인메모리 한계)

### 5.4 RBAC (역할 기반 접근 제어)
**결정**: Permission 테이블에서 역할별 9개 권한 불리언 관리
**이유**: 세분화된 권한 제어, UI에서 매트릭스 형태로 직관적 관리
**트레이드오프**: 새 권한 추가 시 스키마 마이그레이션 필요

### 5.5 키오스크 감지 (클라이언트 사이드)
**결정**: `window.innerWidth` 기반 자동 감지 (≥1080px: kiosk-21, ≥1920px: kiosk-32)
**이유**: 별도 설정 없이 자동 대응, SiteConfig.layoutMode로 강제 설정도 가능
**트레이드오프**: 창 크기 변경 시에만 반영, 장치 DPI 고려 안 함

### 5.6 CMS 클라이언트 캐시 (30초 TTL)
**결정**: `useCmsContent` 훅에서 30초 전역 캐시
**이유**: 빈번한 CMS API 호출 방지, 사용자 체감 성능 향상
**트레이드오프**: 관리자가 콘텐츠 변경 시 최대 30초 지연 (refreshContent로 즉시 갱신 가능)

### 5.7 감사 로그 실패 허용
**결정**: 감사 로그 작성 실패 시 콘솔 에러만 출력, 주 작업은 계속 진행
**이유**: 감사 로그가 주 비즈니스 로직을 방해하지 않도록 보장
**트레이드오프**: 감사 로그 유실 가능성

### 5.8 PWA 캐싱 전략 (4-티어)
**결정**: Service Worker에 4개 캐시 �어 (static, dynamic, images, API)
**이유**: 리소스 유형별 최적의 캐시 전략 적용 — static(Cache First), dynamic(Stale While Revalidate), images(Cache First + 장기), API(Network First + 폴백)
**트레이드오프**: 캐시 무효화 전략 복잡, SW 업데이트 시 사용자가 새 버전 수동 활성화 필요

### 5.9 Hydration 안전 (useClientValue)
**결정**: `useClientValue<T>(serverValue, getClientValue)` 패턴으로 `useSyncExternalStore` 활용
**이유**: SSR/CSR hydration mismatch 방지, Radix UI `aria-controls` ID 불일치 해결, 서버에서는 serverValue 렌더링 후 클라이언트에서만 getClientValue 적용
**트레이드오프**: 최초 렌더링 시 서버 값과 클라이언트 값이 다를 수 있음 (hydration 후에만 정확)

### 5.10 TWA (Trusted Web Activity) 설정
**결정**: Digital Asset Links(`.well-known/assetlinks.json`) + Bubblewrap 래핑
**이유**: PWA를 Android 앱으로 패키징, Play Store 배포 가능, Chrome Custom Tab 대비 네이티브 경험
**트레이드오프**: Android에만 해당, iOS는 별도 PWA 설치 방식 사용, 업데이트 시 Play Store 리뷰 필요

### 5.11 React Strict Mode 비활성화
**결정**: `reactStrictMode: false` (next.config.ts)
**이유**: PWA Service Worker와의 호환성, 이중 렌더링으로 인한 SW 등록 중복 방지
**트레이드오프**: Strict Mode의 개발 중 경고/검증 혜택 상실

---

## 6. 확장 포인트

| 확장 영역 | 현재 | 확장 방향 |
|----------|------|----------|
| 세션 스토어 | 인메모리 Map | Redis 세션 스토어 (다중 인스턴스) |
| 인증 | 이메일/비밀번호 | SSO (OAuth2, SAML), 2FA |
| 데이터베이스 | SQLite | PostgreSQL/MySQL 마이그레이션 |
| CMS 캐시 | 클라이언트 30s | Redis + CDN 캐싱 |
| 콘텐츠 버전 | ContentVersion 테이블 | 롤백 지원, diff 뷰어 |
| 파일 스토리지 | URL 문자열 | S3/OSS 오브젝트 스토리지 + 업로드 API |
| 국제화 | 단일 언어(ko) | i18n 다국어 지원 |
| 알림 | Notification 테이블 + PWA 푸시 | 이메일/Slack/WebSocket 실시간 알림 |
| PWA 오프라인 | 오프라인 페이지 + 캐시 | 오프라인 데이터 동기화, 백그라운드 Sync API |
| TWA 패키징 | Android (Bubblewrap) | iOS (WKWebView), Desktop (Electron/Tauri) |
