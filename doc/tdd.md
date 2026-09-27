# TDD (Technical Design Document)

## AI 플랫폼 관리자 대시보드 기술 설계 문서

| 항목 | 내용 |
|------|------|
| 버전 | 2.1.0 |
| 작성일 | 2025-08-12 |

---

## 1. 기술 스택

### 1.1 코어 프레임워크
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16.1.x | App Router 기반 풀스택 프레임워크 |
| TypeScript | 5.x | 정적 타입 언어 |
| React | 19.x | UI 라이브러리 |
| Bun | latest | 런타임 및 패키지 매니저 |

### 1.2 스타일링 & UI
| 기술 | 버전 | 용도 |
|------|------|------|
| Tailwind CSS | 4.x | 유틸리티 기반 CSS |
| shadcn/ui | latest | 컴포넌트 라이브러리 (New York 스타일) |
| Lucide React | latest | 아이콘 라이브러리 |
| Framer Motion | 12.x | 애니메이션 라이브러리 |
| Recharts | latest | 대시보드 차트 라이브러리 |

### 1.3 데이터 & 상태
| 기술 | 버전 | 용도 |
|------|------|------|
| Prisma | 6.x | ORM (SQLite 클라이언트) |
| Zustand | 5.x | 클라이언트 상태 관리 (admin-store) |
| Sonner | 2.x | 토스트 알림 |
| bcrypt | latest | 비밀번호 해싱 |

### 1.4 AI SDK
| 기술 | 용도 |
|------|------|
| z-ai-web-dev-sdk | 내장 AI 제공자 (LLM, 이미지 생성/편집) |
| OpenAI API | GPT-4o-mini 채팅, GPT-Image-1 이미지 편집 |
| Google Gemini API | Gemini 2.0 Flash 채팅 |
| xAI API | Grok-3-mini 채팅 |
| Anthropic API | Claude Sonnet 4 채팅 |

### 1.5 PWA
| 기술 | 용도 |
|------|------|
| Service Worker | 오프라인 캐싱, 백그라운드 동기화, 푸시 알림 |
| Web App Manifest | 설치 가능, 아이콘, shortcuts, share_target |
| Push API | VAPID 기반 푸시 알림 |
| Background Sync | 오프라인→온라인 자동 동기화 |

---

## 2. 시스템 아키텍처 다이어그램

```
┌──────────────────────────────────────────────────────────┐
│                    사용자 브라우저                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  AI Platform  │  │Admin Dashboard│  │ CMS Cache    │  │
│  │  (6 tabs)    │  │  (6 tabs)    │  │(useCmsContent│  │
│  └────┬─────────┘  └────┬─────────┘  └──────┬────────┘  │
│       │                  │                     │          │
│  ┌────┴──────────────────┴─────────────────────┐         │
│  │          Service Worker (PWA)                │         │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐  │         │
│  │  │정적  │ │API   │ │HTML  │ │오프라인  │  │         │
│  │  │캐시  │ │캐시  │ │캐시  │ │폴백     │  │         │
│  │  └──────┘ └──────┘ └──────┘ └──────────┘  │         │
│  └─────────────────────────────────────────────┘         │
│                          │ fetch() + Bearer Token         │
└──────────────────────────┼───────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────┐
│      Caddy Gateway (Port 81)                              │
│      Reverse Proxy → localhost:3000                       │
│      XTransformPort → localhost:XXXX                      │
└──────────────────────────┼───────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────┐
│  Next.js App (Port 3000)                                  │
│  ┌────────────────────────┴───────────────────┐           │
│  │               App Router                    │           │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐ │           │
│  │  │  Pages   │  │Admin API │  │ Public   │ │           │
│  │  │  (/)     │  │(/admin/*)│  │(/api/*)  │ │           │
│  │  └──────────┘  └────┬─────┘  └──────────┘ │           │
│  └──────────────────────┼─────────────────────┘           │
│                          │                                │
│  ┌───────────────────────┴─────────────────────┐         │
│  │         인증·인가 레이어                      │         │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │         │
│  │  │Sessions  │  │  RBAC    │  │  Audit   │  │         │
│  │  │(In-Mem)  │  │(Perms)  │  │(Logger)  │  │         │
│  │  └──────────┘  └──────────┘  └──────────┘  │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  ┌────────────────────────────────────────────┐          │
│  │         AI Provider + CMS                  │          │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐ │          │
│  │  │OpenAI│ │Gemini│ │ Grok │ │ z-ai-sdk  │ │          │
│  │  └──────┘ └──────┘ └──────┘ └──────────┘ │          │
│  └────────────────────────────────────────────┘          │
│                                                          │
│  ┌────────────────────────────────────────────┐          │
│  │       Prisma ORM → SQLite (13 models)      │          │
│  └────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────┘
```

---

## 3. 관리자 인증 시스템 설계

### 3.1 세션 스토어

```typescript
// 인메모리 Map 기반 세션 관리
const sessions = new Map<string, Session>()

interface Session {
  userId: string      // AdminUser.id
  email: string       // AdminUser.email
  role: string        // AdminUser.role
  expiresAt: number   // 생성 시간 + 24h
}
```

### 3.2 인증 흐름

```
1. 클라이언트: POST /api/admin/auth { email, password }
2. 서버: AdminUser 조회 (email 기반)
3. 서버: isActive 확인 → false면 401
4. 서버: bcrypt.compare(password, passwordHash) → false면 401
5. 서버: createSession(userId, email, role) → token
6. 서버: logAction(userId, email, 'login', 'user')
7. 서버: lastLoginAt 업데이트
8. 응답: { token, user: { id, email, name, role } }
9. 클라이언트: admin-store.login(token, user)
10. 클라이언트: localStorage에 토큰·사용자 정보 저장
```

### 3.3 권한 확인

```typescript
// 모든 admin API 라우트의 공통 패턴
const session = authenticateRequest(request)
if (!session) return Response.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })

const permitted = await hasPermission(session.role, 'canManageContent')
if (!permitted) return Response.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
```

---

## 4. CMS 콘텐츠 아키텍처

### 4.1 키-값 스토어 설계

```
Content 테이블:
┌────────────────────┬──────────┬────────┬──────────────────┐
│ key                │ category │ type   │ value            │
├────────────────────┼──────────┼────────┼──────────────────┤
│ home.hero.title    │ home     │ text   │ "AI 플랫폼"      │
│ home.hero.subtitle │ home     │ text   │ "AI와 함께..."   │
│ home.hero.image    │ home     │ image  │ "/images/hero.png"│
│ chat.welcome       │ chat     │ text   │ "안녕하세요!"     │
│ quiz.easy.label    │ quiz     │ text   │ "초급"           │
│ global.primaryColor│ global   │ color  │ "#10b981"        │
│ nav.items          │ nav      │ json   │ '[{"label":"홈"}]'│
└────────────────────┴──────────┴────────┴──────────────────┘
```

### 4.2 CMS 콘텐츠 카테고리

| 카테고리 | 설명 | 프론트엔드 사용처 |
|---------|------|-----------------|
| home | 홈 화면 | HomePage |
| chat | AI 대화 | ChatPanel |
| image | 이미지 변환 | ImagePanel |
| future | 미래의 나 | FutureMePanel |
| quiz | AI 퀴즈 | QuizPanel |
| settings | 설정 | SettingsPanel |
| global | 전역 설정 | 모든 페이지 |
| nav | 네비게이션 | 헤더/사이드바 |

### 4.3 콘텐츠 타입별 편집 UI

| 타입 | 편집 UI | 설명 |
|------|---------|------|
| text | Input 필드 | 단문 텍스트 |
| rich_text | Textarea | 장문 텍스트 (마크다운 등) |
| image | Input + 미리보기 | 이미지 URL |
| json | Textarea + JSON 검증 | 구조화된 데이터 |
| color | Color Picker | 색상 값 |
| url | Input (type=url) | URL 링크 |

### 4.4 클라이언트 캐시 전략

```typescript
// useCmsContent 훅
let contentCache: CmsContentMap = {}   // 전역 캐시 (모든 컴포넌트 공유)
let cacheTimestamp = 0                  // 캐시 시간
const CACHE_TTL = 30_000               // 30초 TTL

// 흐름:
// 1. 캐시가 유효하면 (now - cacheTimestamp < 30s) → 캐시 반환
// 2. 캐시 만료 또는 최초 → fetch /api/cms/content
// 3. 응답 → contentCache 갱신, cacheTimestamp 갱신
// 4. refreshContent() → 캐시 무효화 + 강제 fetch
```

---

## 5. 키오스크 감지 및 반응형 설계

### 5.1 레이아웃 모드

| 모드 | 감지 조건 | 폰트 배율 | 터치 타겟 |
|------|----------|----------|----------|
| auto | 기본값 (화면 너비로 자동 판단) | 1x | 44px |
| kiosk-21 | width ≥ 1080px | 1.25x | 56px |
| kiosk-32 | width ≥ 1920px | 1.5x | 64px |
| desktop | 1024px ≤ width < 1080px | 1x | 44px |
| tablet | 768px ≤ width < 1024px | 1x | 44px |
| mobile | width < 768px | 1x | 44px |

### 5.2 키오스크 감지 로직

```typescript
// AdminPanel.tsx
const detectKioskMode = () => {
  const width = window.innerWidth
  if (width >= 1920) return 'kiosk-32'
  if (width >= 1080) return 'kiosk-21'
  return 'auto'
}

// SiteConfig.layoutMode가 'auto'가 아니면 강제 적용
const effectiveMode = siteConfig.layoutMode === 'auto'
  ? detectKioskMode()
  : siteConfig.layoutMode
```

### 5.3 키오스크 UI 적용

| 요소 | 기본 | kiosk-21 | kiosk-32 |
|------|------|----------|----------|
| 탭 라벨 | text-sm | text-base | text-lg |
| 카드 제목 | text-lg | text-xl | text-2xl |
| 통계 숫자 | text-2xl | text-3xl | text-4xl |
| 버튼 | h-9 | h-12 | h-14 |
| 패딩 | p-4 | p-6 | p-8 |
| 간격 | gap-4 | gap-6 | gap-8 |

---

## 6. PWA 아키텍처

### 6.1 Service Worker 캐시 계층

```
┌─────────────────────────────────────────────┐
│            Service Worker                     │
│                                              │
│  Tier 1: 정적 자산 (JS/CSS/폰트/이미지)      │
│  전략: Cache-First                            │
│  TTL: immutable (콘텐츠 해시 기반)            │
│                                              │
│  Tier 2: API 응답                            │
│  전략: Network-First                          │
│  TTL: SW 내부 캐시 (서버 헤더: no-store)      │
│                                              │
│  Tier 3: HTML 페이지                          │
│  전략: Stale-While-Revalidate                 │
│  TTL: no-cache (항상 재검증)                  │
│                                              │
│  Tier 4: 오프라인 폴백                        │
│  전략: Precache                               │
│  대상: /offline.html, 앱 셸                   │
└─────────────────────────────────────────────┘
```

### 6.2 PWA 훅 및 컴포넌트

| 모듈 | 파일 | 용도 |
|------|------|------|
| usePWA | `src/hooks/use-pwa.ts` | 설치 프롬프트, 오프라인 상태, 업데이트 감지 |
| useHydrated | `src/hooks/use-hydrated.ts` | 하이드레이션 안전 래퍼 (useClientValue, useHydrated) |
| PWAInstallBanner | `src/components/pwa-install-banner.tsx` | 설치 유도 배너 |
| OfflineIndicator | `src/components/offline-indicator.tsx` | 오프라인 상태 표시 |
| PWANotificationManager | `src/components/pwa-notification-manager.tsx` | 푸시 알림 관리 |
| PWASettingsPanel | `src/components/pwa-settings-panel.tsx` | PWA 설정 패널 |

### 6.3 PWA API 라우트

| 라우트 | 메서드 | 용도 |
|--------|--------|------|
| /api/pwa/subscribe | POST | 푸시 알림 구독 등록 |
| /api/pwa/notify | POST | 푸시 알림 전송 |

### 6.4 Web App Manifest

```json
{
  "name": "AI 플랫폼",
  "short_name": "AI플랫폼",
  "start_url": "/",
  "display": "standalone",
  "shortcuts": [...],
  "screenshots": [...],
  "share_target": {...}
}
```

### 6.5 TWA (Trusted Web Activity)

| 파일 | 용도 |
|------|------|
| `public/.well-known/assetlinks.json` | Digital Asset Links (앱-웹 연결 검증) |
| `twa/bubblewrap-config.json` | Bubblewrap TWA 빌드 설정 |
| `twa/BUILD_GUIDE.md` | TWA 빌드 가이드 |

---

## 7. 하이드레이션 안전 설계

### 7.1 문제: SSR/CSR 값 불일치

Next.js SSR에서 생성된 HTML과 클라이언트 하이드레이션 결과가 불일치하면:
- React 콘솔 경고: "Text content did not match"
- UI 깜빡임 (FOUC)
- Radix UI `aria-controls` ID 불일치

### 7.2 해결: useClientValue 패턴

```typescript
// src/hooks/use-hydrated.ts
import { useSyncExternalStore } from 'react'

// SSR 시 고정값 반환, CSR 시 실제값 반환
const emptySubscribe = () => () => {}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,   // 클라이언트: 하이드레이션 완료
    () => false    // 서버: 하이드레이션 미완료
  )
}

export function useClientValue<T>(clientValue: T, serverValue: T): T {
  const hydrated = useHydrated()
  return hydrated ? clientValue : serverValue
}
```

### 7.3 적용 사례

| 컴포넌트 | 적용 대상 | 서버값 | 클라이언트값 |
|---------|----------|--------|------------|
| Radix UI Dialog | aria-controls ID | 빈 문자열 | 실제 ID |
| localStorage 접근 | 토큰/사용자 정보 | null | localStorage 값 |
| window 의존 값 | 화면 크기, 스크롤 위치 | 기본값 | 실제 window 값 |

---

## 8. 데이터 흐름

### 8.1 관리자 콘텐츠 편집 흐름

```
관리자 입력
  → Permission Check (canManageContent)
  → API Route (PUT /api/admin/content)
  → Prisma Update (Content 테이블)
  → Audit Log (action: 'update', entity: 'content')
  → Response (수정된 콘텐츠)
  → 클라이언트 상태 갱신
  → 프론트엔드 CMS 캐시 만료 (최대 30초 후 반영)
```

### 8.2 프론트엔드 콘텐츠 로드 흐름

```
컴포넌트 마운트
  → useCmsContent() 호출
  → 캐시 확인 (30초 TTL)
  → 캐시 적중 → 즉시 반환 (< 1ms)
  → 캐시 미적중 → fetch /api/cms/content
  → 응답 → 전역 캐시 갱신
  → getContent(key, fallback) → 값 반환
```

### 8.3 사용자 생성 흐름

```
관리자 입력 (이메일, 이름, 비밀번호, 역할)
  → Permission Check (canManageUsers)
  → 이메일 중복 확인 (unique 제약)
  → bcrypt.hash(password, 10) → passwordHash
  → Prisma Create (AdminUser 테이블)
  → Audit Log (action: 'create', entity: 'user')
  → Response (passwordHash 제외)
```

---

## 9. 환경 변수 설계

```env
DATABASE_URL=file:./db/custom.db
OPENAI_API_KEY=          # 선택사항
GEMINI_API_KEY=          # 선택사항
GROK_API_KEY=            # 선택사항
CLAUDE_API_KEY=          # 선택사항
DEFAULT_AI_PROVIDER=zai-built-in
NEXT_PUBLIC_VAPID_PUBLIC_KEY=   # PWA 푸시 알림 공개 키
VAPID_PRIVATE_KEY=              # PWA 푸시 알림 비공개 키
```

**우선순위**: 설정 페이지 DB 값 > .env 환경 변수 > 내장 AI (z-ai-built-in)

---

## 10. 데이터베이스 모델 (13개)

| 모델 | 용도 |
|------|------|
| AdminUser | 관리자 계정 |
| Content | CMS 콘텐츠 |
| SiteConfig | 사이트 설정 |
| Permission | 역할별 권한 (9개 필드) |
| AuditLog | 감사 로그 |
| AiConfig | AI 제공자 설정 |
| ChatMessage | 채팅 메시지 |
| QuizQuestion | 퀴즈 문제 |
| ImageJob | 이미지 처리 작업 |
| Notification | 알림 (v2.1 추가) |
| UserActivity | 사용자 활동 (v2.1 추가) |
| ContentVersion | 콘텐츠 버전 (v2.1 추가) |
| OnboardingProgress | 온보딩 진행 (v2.1 추가) |

### 10.1 권한 필드 (9개)

| 필드 | 설명 |
|------|------|
| canManageUsers | 사용자 관리 |
| canManageContent | 콘텐츠 관리 |
| canManageConfig | 설정 관리 |
| canViewAudit | 감사 로그 조회 |
| canDeleteContent | 콘텐츠 삭제 |
| canManageAPIKeys | API 키 관리 |
| canManageNotifications | 알림 관리 (v2.1 추가) |
| canExportData | 데이터 내보내기 (v2.1 추가) |
| canViewAnalytics | 분석 조회 (v2.1 추가) |

---

## 11. 빌드 및 배포

### 11.1 개발 모드
```bash
bun run dev    # Next.js 개발 서버 (Turbopack, Port 3000)
bun run db:push  # 스키마 동기화
```

### 11.2 프로덕션 빌드
```bash
bun run build  # 정적 최적화 빌드
bun run start  # 프로덕션 서버 실행
```

### 11.3 Caddy 게이트웨이
- 외부 포트 81 → 내부 포트 3000 프록시
- `XTransformPort` 쿼리로 다른 포트 라우팅 가능
- HTTPS 종료

### 11.4 PWA 빌드 고려사항
- Service Worker 파일은 빌드 시 자동 생성
- Manifest 파일은 `public/manifest.json`에 위치
- PWA 관련 헤더는 `next.config.ts`에 설정
- PWA 메타 태그는 `layout.tsx`에 포함

---

## 12. 테스트 커버리지 목표

### 12.1 모듈별 커버리지

| 모듈 | 목표 | 우선순위 |
|------|------|----------|
| admin-auth (인증) | 90% | High |
| hasPermission (권한) | 95% | High |
| audit (감사 로그) | 85% | High |
| useCmsContent (CMS 캐시) | 80% | Medium |
| usePWA (PWA 상태) | 80% | Medium |
| useHydrated (하이드레이션) | 90% | High |
| useClientValue (클라이언트 값) | 90% | High |
| SW 등록/캐시 | 70% | Medium |
| 푸시 알림 구독/전송 | 75% | Medium |

### 12.2 PWA 테스트 항목

| 테스트 영역 | 테스트 케이스 | 기대 결과 |
|------------|-------------|----------|
| SW 등록 | navigator.serviceWorker.register | SW 활성화, 콘솔 에러 없음 |
| SW 업데이트 | SW 파일 변경 후 새로고침 | 새 SW 대기 → activate |
| 설치 프롬프트 | beforeinstallprompt 이벤트 | PWAInstallBanner 표시 |
| 설치 완료 | appinstalled 이벤트 | 배너 숨김, 설치 완료 메시지 |
| 오프라인 전환 | 네트워크 단절 | OfflineIndicator 표시, 캐시 페이지 제공 |
| 오프라인 복구 | 네트워크 복구 | OfflineIndicator 숨김, 백그라운드 동기화 |
| 푸시 구독 | 알림 권한 허용 | 구독 객체 생성, /api/pwa/subscribe 호출 |
| 푸시 수신 | 서버에서 알림 전송 | 브라우저 알림 표시 |
| 매니페스트 | manifest.json 로드 | 아이콘, 이름, shortcuts 유효 |

### 12.3 하이드레이션 안전 테스트 항목

| 테스트 영역 | 테스트 케이스 | 기대 결과 |
|------------|-------------|----------|
| useHydrated | 서버 사이드 렌더 | false 반환 |
| useHydrated | 클라이언트 하이드레이션 | true 반환 |
| useClientValue | SSR 시 | serverValue 반환 |
| useClientValue | CSR 시 | clientValue 반환 |
| useClientValue | 전환 시 | 깜빡임 없이 값 전환 |
| Radix UI | aria-controls ID | SSR/CSR 불일치 경고 없음 |
| localStorage | SSR 시 접근 | null 반환 (에러 없음) |
