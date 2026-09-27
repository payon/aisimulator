# Agent (인증·인가 문서)

## AI 플랫폼 관리자 인증 및 인가 아키텍처

| 항목 | 내용 |
|------|------|
| 버전 | 2.1.0 |
| 작성일 | 2025-08-12 |

---

## 1. 인증 흐름 (Authentication Flow)

### 1.1 로그인 시퀀스

```
┌──────────┐     POST /api/admin/auth     ┌──────────────┐
│  Client   │ ──────────────────────────→  │  API Server   │
│ (Login)   │    { email, password }       │              │
└──────────┘                               │  1. DB에서   │
                                           │     사용자   │
┌──────────┐     { token, user }           │     조회     │
│  Client   │ ←──────────────────────────  │  2. bcrypt   │
│ (Store)   │    200 OK                    │     검증     │
└──────────┘                               │  3. 세션     │
                                           │     생성     │
                                           │  4. 감사     │
                                           │     로그     │
                                           └──────────────┘
```

### 1.2 인증된 요청 흐름

```
┌──────────┐     GET /api/admin/*         ┌──────────────┐
│  Client   │ ──────────────────────────→  │  API Server   │
│           │  Authorization: Bearer xxx   │              │
└──────────┘                               │  1. 토큰     │
                                           │     추출     │
┌──────────┐     Response                  │  2. 세션     │
│  Client   │ ←──────────────────────────  │     조회     │
│           │                              │  3. 만료     │
└──────────┘                               │     확인     │
                                           │  4. 권한     │
                                           │     확인     │
                                           │  5. 작업     │
                                           │     수행     │
                                           └──────────────┘
```

### 1.3 로그아웃 시퀀스

```
┌──────────┐     DELETE /api/admin/auth    ┌──────────────┐
│  Client   │ ──────────────────────────→  │  API Server   │
│ (Logout)  │  Authorization: Bearer xxx   │              │
└──────────┘                               │  1. 세션     │
                                           │     삭제     │
┌──────────┐     { success: true }         │  2. 감사     │
│  Client   │ ←──────────────────────────  │     로그     │
│ (Clear)   │                              │  3. localStorage│
└──────────┘                               │     제거     │
                                           └──────────────┘
```

---

## 2. 세션 관리 (Session Management)

### 2.1 세션 스토어 구현

```typescript
// src/lib/admin-auth.ts
interface Session {
  userId: string    // 사용자 ID
  email: string     // 이메일
  role: string      // 역할 (superadmin/admin/editor/viewer)
  expiresAt: number // 만료 시간 (timestamp)
}

const sessions = new Map<string, Session>()
const SESSION_TTL = 24 * 60 * 60 * 1000 // 24시간
```

### 2.2 세션 수명 주기

| 단계 | 동작 | 세션 상태 |
|------|------|----------|
| 생성 | `createSession(userId, email, role)` → UUID 토큰 | 활성 |
| 검증 | `getSession(token)` → Session \| null | 활성/만료 |
| 갱신 | 없음 (슬라이딩 윈도우 미사용) | — |
| 삭제 | `deleteSession(token)` → boolean | 제거됨 |
| 만료 | TTL 24시간 경과 시 자동 제거 | 만료 |
| 정리 | `cleanupExpiredSessions()` 주기적 호출 | 정리됨 |

### 2.3 세션 특성

| 항목 | 값 |
|------|-----|
| 토큰 형식 | UUID v4 (`crypto.randomUUID()`) |
| 저장소 | 인메모리 `Map<string, Session>` |
| TTL | 24시간 (86,400,000ms) |
| 슬라이딩 윈도우 | 미지원 (고정 만료) |
| 다중 디바이스 | 지원 (동일 계정 여러 세션 가능) |
| 서버 재시작 | 모든 세션 초기화 |

### 2.4 클라이언트 저장

```typescript
// src/stores/admin-store.ts (Zustand)
// 하이드레이션 안전 패턴으로 localStorage 접근
const token = useClientValue(
  () => localStorage.getItem('admin_token'),  // 클라이언트
  null                                          // 서버 (SSR)
)
const user = useClientValue(
  () => JSON.parse(localStorage.getItem('admin_user') || 'null'),  // 클라이언트
  null                                                              // 서버 (SSR)
)
```

- 페이지 새로고침 시 `checkAuth()`로 localStorage에서 복원
- 로그아웃 시 localStorage에서 제거
- **v2.1**: SSR 시 `useClientValue`로 null 반환하여 하이드레이션 불일치 방지

---

## 3. 역할 기반 접근 제어 (RBAC)

### 3.1 역할 계층

```
superadmin ─── 최고 권한 (모든 기능)
    │
    └── admin ─── 관리 권한 (사용자·콘텐츠·설정 관리)
         │
         └── editor ─── 편집 권한 (콘텐츠 편집만)
              │
              └── viewer ─── 열람 권한 (조회만)
```

### 3.2 권한 매트릭스

| 권한 | superadmin | admin | editor | viewer |
|------|:----------:|:-----:|:------:|:------:|
| canManageUsers | ✅ | ✅ | ❌ | ❌ |
| canManageContent | ✅ | ✅ | ✅ | ❌ |
| canManageConfig | ✅ | ✅ | ❌ | ❌ |
| canViewAudit | ✅ | ✅ | ❌ | ❌ |
| canDeleteContent | ✅ | ✅ | ❌ | ❌ |
| canManageAPIKeys | ✅ | ❌ | ❌ | ❌ |
| canManageNotifications | ✅ | ✅ | ❌ | ❌ |
| canExportData | ✅ | ✅ | ❌ | ❌ |
| canViewAnalytics | ✅ | ✅ | ❌ | ❌ |

### 3.3 권한 확인 흐름

```
요청 수신
  │
  ├── 1. authenticateRequest(request) → Session | null
  │     └── null → 401 Unauthorized
  │
  ├── 2. hasPermission(session.role, 'canManageUsers') → boolean
  │     └── false → 403 Forbidden
  │
  └── 3. 작업 수행 → 200 OK
```

### 3.4 API 라우트별 권한 요구사항

| API 라우트 | 필수 권한 | 메서드 |
|-----------|----------|--------|
| /api/admin/auth | (인증만) | POST/DELETE/GET |
| /api/admin/content (조회) | canManageContent | GET |
| /api/admin/content (생성) | canManageContent | POST |
| /api/admin/content (수정) | canManageContent | PUT |
| /api/admin/content (삭제) | canDeleteContent | DELETE |
| /api/admin/users (조회) | canManageUsers | GET |
| /api/admin/users (생성) | canManageUsers | POST |
| /api/admin/users (수정) | canManageUsers | PUT |
| /api/admin/users (삭제) | canManageUsers | DELETE |
| /api/admin/roles (조회) | canManageUsers | GET |
| /api/admin/roles (수정) | canManageUsers (superadmin만) | PUT |
| /api/admin/audit (조회) | canViewAudit | GET |
| /api/admin/config (조회) | canManageConfig | GET |
| /api/admin/config (수정) | canManageConfig | PUT |
| /api/admin/stats | (인증만) | GET |
| /api/admin/notifications | canManageNotifications | GET/POST |
| /api/admin/permissions | canManageUsers | GET |
| /api/admin/activity | canViewAudit | GET |
| /api/admin/mock | canManageConfig | GET |
| /api/pwa/subscribe | (인증 불필요) | POST |
| /api/pwa/notify | canManageNotifications | POST |
| /api/cms/content | (인증 불필요) | GET |

---

## 4. Superadmin 보호 규칙

| 규칙 | 설명 |
|------|------|
| 마지막 superadmin 보호 | 시스템에 superadmin이 1명뿐이면 강등/삭제 불가 |
| 자기 자신 삭제 방지 | 자신의 계정을 삭제할 수 없음 |
| 권한 수정 제한 | 역할 권한 수정은 superadmin만 가능 |
| 비활성 계정 로그인 차단 | isActive=false인 계정은 로그인 불가 |

---

## 5. 하이드레이션 안전 패턴 (Hydration Safety Pattern)

### 5.1 문제 배경

Next.js SSR에서 생성된 HTML과 클라이언트 하이드레이션 결과가 불일치하면 React 경고가 발생합니다. 특히:
- `localStorage`는 서버에 존재하지 않아 SSR 시 접근 시 에러 발생
- `window` 의존 값(화면 크기, 스크롤 위치)은 SSR/CSR 간 다름
- Radix UI 컴포넌트의 `aria-controls` ID가 SSR/CSR 간 다를 수 있음

### 5.2 해결: useClientValue

```typescript
// src/hooks/use-hydrated.ts
import { useSyncExternalStore } from 'react'

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

### 5.3 작동 원리

```
SSR 렌더링:
  useSyncExternalStore 서버 스냅샷 → false
  → useHydrated() = false
  → useClientValue(client, server) = server
  → HTML에 server 값으로 렌더링

클라이언트 하이드레이션:
  useSyncExternalStore 클라이언트 스냅샷 → true
  → useHydrated() = true
  → useClientValue(client, server) = client
  → client 값으로 전환 (일회성 리렌더)
```

### 5.4 적용 사례

| 컴포넌트 | 적용 대상 | serverValue | clientValue |
|---------|----------|-------------|------------|
| admin-store | localStorage 토큰 | `null` | `localStorage.getItem('admin_token')` |
| admin-store | localStorage 사용자 | `null` | `JSON.parse(localStorage.getItem('admin_user'))` |
| Radix UI Dialog | aria-controls | `""` | 실제 ID |
| PWA 훅 | navigator 온라인 상태 | `true` | `navigator.onLine` |
| 키오스크 감지 | window.innerWidth | `1024` | `window.innerWidth` |

### 5.5 사용 규칙

1. **모든 `localStorage` 접근은 `useClientValue`로 래핑**
2. **`window` 의존 값은 `useClientValue`로 SSR 대비**
3. **동적 DOM ID는 SSR 시 빈 문자열 반환**
4. **`useHydrated` 직접 사용은 조건부 렌더링에만 허용**
5. **`useClientValue` 미적용 컴포넌트는 코드 리뷰 시 확인**

---

## 6. 보안 고려사항

### 6.1 비밀번호 처리

```
저장: password → bcrypt.hash(password, 10) → passwordHash
검증: password + passwordHash → bcrypt.compare() → boolean
```

- salt rounds: 10
- 절대 평문 저장하지 않음
- API 응답에서 passwordHash 필드 미포함

### 6.2 세션 토큰 보안

| 항목 | 내용 |
|------|------|
| 토큰 생성 | `crypto.randomUUID()` (CSPRNG 기반) |
| 토큰 전송 | Authorization 헤더 (HTTPS) |
| 토큰 저장 | 클라이언트 localStorage (하이드레이션 안전 접근) |
| 토큰 노출 | URL에 포함하지 않음 (쿼리 스트링 금지) |
| 토큰 무효화 | 서버에서 즉시 삭제 가능 (JWT 대비 장점) |

### 6.3 알려진 제한사항

| 제한 | 영향 | 완화 방안 |
|------|------|----------|
| 인메모리 세션 | 서버 재시작 시 전원 로그아웃 | 재로그인 필요 (안내 메시지) |
| localStorage 토큰 | XSS 공격 시 탈취 가능 | CSP 헤더, 입력 검증 |
| 단일 인스턴스 | 다중 서버 세션 공유 불가 | 향후 Redis 세션 스토어 |
| 슬라이딩 윈도우 미지원 | 24시간 후 강제 로그아웃 | 향후 세션 갱신 구현 |
| 하이드레이션 제한 | useClientValue 미적용 시 불일치 | 코드 리뷰 체크리스트 항목 |
