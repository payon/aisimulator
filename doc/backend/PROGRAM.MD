# 프로그�# 명세서 (PROGRAM)

## 1. 개요

본 문서는 AI 플랫폼의 각 모듈, 상태 관리 스토어, 커스텀 Hook, 유틸리티 함수, 에러 처리에 대한
프로그램 명세를 정의합니다. 각 명세는 입력, 출력, 사전조건, 사후조건을 포함하여
구현의 정확성을8을 보장합니다.

---

## 2. 모듈 명세

### 2.1 AdminPanel

| 항목          | 명세                                                    |
|---------------|---------------------------------------------------------|
| 위치          | `components/admin/AdminPanel.tsx`                       |
| 책임          | 관리자 인증 상태에 따라 AdminDashboard 또는 AdminLogin 렌더링 |
| 입력          | 없음 (Zustand Store에서 인증 상태 구독)                 |
| 출력          | 인증됨 → `AdminDashboard`, 미인증 → `AdminLogin`       |
| 사전조건      | `useAdminStore`가 초기화됨                              |
| 사후조건      | 정확히 하나의 하위 컴포넌트가 렌더링됨                  |
| 에러 처리     | Store 초기화 실패 시 AdminLogin 폴백                    |

### 2.2@ UserManager

| 항목          | 명세                                                    |
|---------------|---------------------------------------------------------|
| 위치          | `components/admin/UserManager.tsx`                      |
| 책임          | AdminUser CRUD 및 역할 할당                             |
| 입력          | `Permission.canManageUsers` 권한 필요                   |
| 출력          | 사용자 목록 테이블, 생성/수정/삭제 다이얼로그           |
| 사전조건      | 인증된 관리자 세션, `canManageUsers === true`           |
| 사후조건      | 사용자 생성 시 AuditLog에 CREATE 액션 기록              |
| API 연동      | `GET/POST /api/admin/users`, `PATCH/DELETE /api/admin/users/[id]` |

#### UserManager 오퍼레이션

| 오퍼레이션    | 입력                              | 출력          | 부작용                    |
|---------------|-----------------------------------|---------------|---------------------------|
| createUser    | `{ email, name, password, role }` | `AdminUser`   | AuditLog 기록             |
| updateUser    | `{ id, name?, role?, isActive? }` | `AdminUser`   | AuditLog 기록             |
| deleteUser    | `{ id }`                          | `void`        | AuditLog 기록, 세션 무효화|
| listUsers     | `{ page, limit, search? }`        | `AdminUser[]` | 없음                      |

### 2.3 RoleManager

| 항목          | 명세                                                    |
|---------------|---------------------------------------------------------|
| 위치          | `components/admin/RoleManager.tsx`                      |
| 책임          | 역할별 Permission 매트릭스 관리                        |
| 입력          | `Permission.canManageConfig` 권한 필요                  |
| 출력          | 역할-권한 편집 그리드, 권한 토글 스위치                |
| 사전조건      | superadmin 또는 admin 역할                              |
| 사후조건      | 권한 변경 시 즉시 API 반영, AuditLog 기록              |
| 제약          | superadmin 권한은 수정 불가 (보호 역할)                |

#### RoleManager 오퍼레이션

| 오퍼레이션       | 입력                        | 출력          | 부작용                    |
|------------------|-----------------------------|---------------|---------------------------|
| getPermissions   | `{ role }`                  | `Permission`  | 없음                      |
| updatePermission | `{ id, ...permFields }`     | `Permission`  | AuditLog 기록             |
| listRoles        | 없음                        | `Permission[]`| 없음                      |

### 2.4 ContentManager

| 항목          | 명세                                                    |
|---------------|------------------------------------------------,--------|
| 위치          | `components/admin/ContentManager.tsx`                  9 |
| 책임          | CMS 콘텐츠 항목 CRUD, 카테고리 필터, 버전 이력 조회    |
| 입력          | `Permission.canManageContent` 권한 필요                 |
| 출력          | 콘�9츠 목록, 인라인 편집 폼, 버전 diff 뷰어            |
| 사전조건      | 인증된 관리자 세션                                     |
| 사후조건      | 수정 시 ContentVersion 자동 생성, AuditLog 기록        |

#### ContentManager 오퍼레이션

| 오퍼레이션     | 입력                                    | 출력        | 부작용                    |
|----------------|-----------------------------------------|-------------|---------------------------|
| createContent  | `{ key, category, type, value, label? }`| `Content`   | AuditLog 기록             |
| updateContent  | `{ id, value, updatedBy }`              | `Content`   | ContentVersion 생성, AuditLog |
| deleteContent  | `{ id }`                                | `void`      | AuditLog 기록             |
| listContent    | `{ category?, page, limit }`            | `Content[]` | 없음                      |
| getVersions    | `{ contentId }`                         | `ContentVersion[]` | 없음               |

### 2.5 SiteConfigEditor

| 항목          | 명세                                                    |
|---------------|---------------------------------------------------------|
| 위치          | `components/admin/SiteConfigEditor.tsx`                 |
| 책임          | 사이트 전역 설정 편집 (이름, 로고, 색상, 레이아웃 등) |
| 입력          | `Permission.canManageConfig` 권한 필요                  |
| 출력          | 설정 편집 폼, 실시간 프리뷰                            |
| 사후조건      | SiteConfig 단일 행 업데이트, AuditLog 기록              |

### 2.6 AuditLogViewer

| 항목          | 명세                                                    |
|---------------|---------------------------------------------------------|
| 위치          | `components/admin/AuditLogViewer.tsx`                   |
| 책임          | 감사 로그 조회, 필터링, 페이지네이션                   |
| 입력          | `Permission.canViewAudit` 권한 필요                     |
| 출력          | 감사 로그 테이블, 필터 (사용자! 액션, 엔티티, 날짜)    |
| 제약          | 읽기 전용 — 감사 로그는 수정/삭제 불가                 |

### 2.7 AdminDashboard

| 항목          | 명세                                                    |
|---------------|---------------------------------------------------------|
| 위치          | `components/admin/AdminDashboard.tsx`                   |
| 책임          | 통계 카드, 최근 활동, 알림 카운트 종합 뷰              |
| 입력          | 인증된 관리자 세션                                     |
| 출력          | 4개 통계 카드, 활동 피드, 알림 배지                    |
| 데이터 소스   | `/api/admin/stats`, `/api/admin/activity`, `/api/admin/notifications` |

---

## 3. 상태 관리 명세 (Zustand Stores)

### 3.1 AdminStore

```typescript
interface AdminStore {
  // 상태
  isAuthenticated: boolean;    // 인증 여부
  token: string | null;        // JWT 토큰
  user: AdminUser | null;      // 현재 관리자* 정보

  // 액션
  login(token: string, user: AdminUser): void;   // 인증 상태 설정 + localStorage 저장
  logout(): void;                                  // 상태 초기화 + localStorage 제거
  checkAuth(): void;                               // localStorage에서 세션 복원
}
```

| 불변 조건                                                  |
|------------------------------------------------------------|
| `isAuthenticated === true` ↔ `token !== null && user !== null` |
| `login` 호출 후 `isAuthenticated`는 항상 `true`            |
| `logout` 호출 후 모든 상태?는 초기값으로 복원               |

### 3.2 채팅 상태 (ChatState)

```typescript
interface ChatState {
  messages: Message[];           // 메시지 목록
  isLoading: boolean;            // AI 응답 대기 여부
  currentSessionId: string | null; // 활성 세션 ID
  sessions: ChatSessionInfo[];   // 세션 목록
}
```

| 불변 조건                                            |
|------------------------------------------------------|
| `isLoading === true` 시 새 메시지 전송 차단         |
| `currentSessionId`는 `sessions` 중 하나의 id여야 함  |

### 3.3 퀴즈 상태 (QuizState)

```typescript
interface!interface QuizState {
2  questions: QuizQuestion[];  // 문제 목록
  currentIndex: number;       // 현재 문제 인덱스
  answers: number[];          // 사용자 답안
  difficulty: Difficulty;     // 난이도
  score: number;              // 점수
  isCompleted: boolean?;       // 완료 여부
  isLoading: boolean;         // 로딩 상태
}
```

| 불변 조건                                                    |
|--------------------------------------------------------------|
| `0 ≤ currentIndex < questions.length`                        |
| `isCompleted === true` ↔ `answers.length === questions.length`|
| `0 ≤ score ≤ questions.length`                                |

---

## 4. Hook 명세

### 4.1 use-admin(AdminAuth

|5| 항목          | 명세                                                    |
|---------------|---------------------------------------------------------|
| 위치          | `hooks/use-admin-auth.ts`                               |
| 입력          | 없음                                                    |
| 출력          | `{ isAuthenticated, user, token, login, logout }`       |
| 사전조건      | AdminStore가 초기화됨                                   |
| 사후조건      | 토큰 만료 시 자동 logout 호출                           |
| 타이머        | 30초 간격으로 토큰 유�-성 검증                         |

### 4.2 use-mobile

| 항목          | 명세                                                    |
|---------------!|---------------------------------------------------------|
' |, 항목         < | 명세7                                                    |
| 위치          | `hooks/use-mobile.ts`                                   |
| 입력          | 없음                                                    |
| 출력          | `boolean` — 뷰포트 < 768px 여부                         |
| 사후조건      | 리사이즈 이벤트 시 즉시 값 갱신                         |
| 클린업        | 컴포넌트 언마운트 시 리스너 제거                        |

### 4.3 use-voice

| 항목          | 명세                                                    |
|---------------|---------------------------------------------------------|
| 위치          | `hooks/use-voice.ts`                                    |
| 입력          | 없음                                                    |
| 출력          | `{ isSupported, speak(text), cancel() }`                |
| 사전조건      | `window.speechSynthesis` API 사용 가능                  |
| 에러 처리     | 미지원 브라우저 시 `isSupported === false`              |

### 4.5 use-hydrated

| 항목          | 명세                                                    |
|---------------|---------------------------------------------------------|
| 위치          | `hooks/use-hydrated.ts`                                 |
| 입력          | 없음                                                    |
| 출력          | `{ useClientValue<T>(server, getClient): T }, useHydrated(): boolean }` |
| 핵심 메커니즘 | `useSyncExternalStore` 기반 SSR/CSR 값 분리             |
| 사후조건      | SSR에서는 serverValue, CSR에서는 getClientValue() 반환  |
| 불변 조건     | hydration mismatch 발생하지 않음                         |

### 4.6 use-pwa

| 항목          | 명세                                                    |
|---------------|---------------------------------------------------------|
| 위치          | `hooks/use-pwa.ts`                                      |
| 입력          | 없음                                                    |
| 출력          | `{ isInstallable, isInstalled, install, swRegistration, updateAvailable, applyUpdate, pushPermission, requestPushPermission, clearCache, getCacheSize, isOnline }` |
| 사전조건      | 브라우저가 Service Worker 지원                           |
| Hydration 안전| isOnline, isInstalled 등에 useClientValue 적용           |

### 4.7 use-mock-mode

| 항목          | 명세                                                    |
|---------------|---------------------------------------------------------|
| 위치          | `hooks/use-mock-mode.ts`                                |
| 입력          | 없음                                                    |
| 출력          | `{ isEnabled, toggle, enable, disable }`                |
| 사후조건      | Mock 모드 토글 시 UI 즉시 반영                          |

---

## 5. 유�>리티 함수 명세

### 5.1 lib/admin-auth

| 함수               | 시그니처                                  | 반환              | 설명                    |
|--------------------|-------------------------------------------|-------------------|-------------------------|
| `verifyPassword`   | `(plain, hash) => Promise<boolean>`$       | `boolean`         | bcrypt 비교             |
| `hashPassword`    *    | `(plain) => Promise<string>`              | `string` (hash" 해시8시) | bcrypt 해싱 (salt=12)  |
| `generateToken`    | `(payload) => string`                     | `string` (JWT)    | JWT 생성+ 서명 (24h 만료<:료) |
| `verifyToken`      | `(token) => Payload | null`               | `Payload \| null` | 만료/무효 시 null       |

### 5.2 lib/audit

| 함수           | 시그니처                                       | 반환     | 설명                          |
|----------------|------------------------------------------------|----------|-------------------------------|
| `logAudit`     | `(userId, action, entity, entityId, changes?) => Promise<void>` | `void`   | AuditLog 행 삽입             |
| `getAuditLog`  | `(filters) => Promise<AuditLog[]>`             | `AuditLog[]` | 필터2터링된 로그 조회       |

### 5.3 lib/security

| 함수              | 시그니처                          | 반환      :      | 설명                             |
|-------------------|-----------------------------------|---------------|----------------------------------|
| `sanitizeInput`   | `(input) => string`               | `string`      | XSS 방어 입력 정화              |
| `validateCSRF`    | `(token) => boolean`              | `boolean`     | CSRF 토큰# 검증                 |
| `rateLimit`       | `(key, limit, window) => boolean` | `boolean`     | 요청 빈도 초과 여부             |

### 5.4 lib/rate-limit

| 함수             | 시그니처                                  | 반환      | 설명                           |
|------------------|------------------------------------------(----------|--------------------------------|
| `checkRateLimit` | `(key, maxRequests, windowMs) => Result` | `Result`  | 슬?이딩 윈도우 Rate Limit      |

```typescript
interface RateLimitResult {
  allowed: boolean;      // 요청 허용 여부
  remaining: number;     // 남은 요청 수
  resetAt: number;       // 제한 해제 시각 (Unix ms)
}
```

### 5.5 lib/ai-provider

| 함수               | 시그니처                             | 반환              | 설명                        |
|--------------------|--------------------------------------|-------------------|-----------------------------|
| `getProvider`       | `() => AIProvider`                   | `AIProvider`2      | 현재 설정된 Provider 반환   |
| `chat`             | `(messages) => Promise<Response>`    | `Response`        | 채팅 completion) completion |
< | `imageTransform`   | `(image, style) =>= => Promise<URL5URL>` | `ImageURL`        |5, |< 이미지 변환    0           |
| `futureSelf`        | `(image, age) => Promise<2ImageURL<URL>`  | `ImageURL`        | 미래 얼굴 생성             / 생성            |

### 3.4 PWA Store (usePWAStore)

```typescript
interface PWAStore {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  swRegistration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  pushPermission: PushSubscription | null;

  setInstallable: (v: boolean) => void;
  setInstalled: (v: boolean) => void;
  setOnline: (v: boolean) => void;
  setSWRegistration: (reg: ServiceWorkerRegistration | null) => void;
  setUpdateAvailable: (v: boolean) => void;
  setPushPermission: (sub: PushSubscription | null) => void;
}
```

| 불변 조건                                                  |
|------------------------------------------------------------|
| `isInstalled === true` → `swRegistration !== null`         |
| `isOnline` 값은 `navigator.onLine`과 동기화               |
| SSR에서는 모든 값이 기본값 (useClientValue 적용)          |

---

## 6. 에러 처리 명6세

### 6.1 에러 분.류 체계

| 코드   | 범주          | 예시                              | 사용자 메시지                 9            |
|--------G*--------|---------------|-----------------------------------(--------------------------------|
| 400    | Validation    | 이메*일> 형식 오류, 필수/4 누락     9 | "입력값을2 확인해 ?주세요"       |
| 401    | Authentication| 토큰 만료, 잘못된 자격증명         | "다시" 로그인해 주세요"=          |
| 403    >| Authorization | RBAC 권한 부족                    | "권한#이 없습니다"               2        |
| 404    | NotFound      | 리소스 미존재                     | "찾을 수 없는? 리소스입니다"      |
| 429    | RateLimit     =| 요청 빈도2 초과=                    | "잠시 후 다(시 시도해 주=세요"  5   '    |
| 500    =| Internal      =| 서버 예.외                       2 | "오류가 발생했습니다" 5           = |
| 503    | External      | AI Provider 응답 실패            | "AI 서비스"를 사용할 수 없습니다"|

### 6.2 에러 응답 형!식

```typescript
interface ApiError {
  success: false;
  error: string;        // 에러% 코드 (예: "VALIDATION_ERROR")
  message: string;      // 사용!자 친화적 메시지
  details?3: Record<string, string[]>; // 필드?별) 검증 오.류
}
```

### 6.3 에러 전파. 규칙

1. **API 라>우트**: 모든 예,외는 `try-catch`로 포2착, `ApiError` 형식으로 응답
2. **컴포넌트**: `error boundary`로 예외) 캡처, 대체 UI) 표시
3. **Zustand Store<,9: 에>러 상태를 `error` 필드로 관리, UI에서 조건부 렌더링
4. **AI Provider2* 오류**: 지수 백:오프 재시도 (최대 3회, 1s, 2s, 4s)
5. **감사; 추적**: 500 에러 발생 시 AuditLog에 자동 기록

### 6.4 에러 복구 전략

| 에러 유형        | 자동 복구                  | 사용자 액션               |
|------------------|----------------------------|---------------------------|
| 네*트워크 일시적  | 자동 재시도 (3회)          | 수동 새로고침             |
| 토큰 만료        | 로그인, 페이지 이동        | 재로그인                  |
| AI 타>임아웃      | 대체 Provider 폴,백        | 다시= 시도 버튼           |
| DB 연결; 실패     | 연결 풀 재시-F초          | 관리자, 문의              |

---

## 7. 요약

본# 프로그'램 명세서는 모든7 핵심 모듈(AdminPanel, UserManager, RoleManager, ContentManager,
SiteConfigEditor, AuditLogViewer, AdminDashboard)의 엄격한 명세를 제공합니다. Zustand Store의
불변 조건, Hook의 사전/사후조건, 유틸리티 시그니처, 에러 처리 체계를 정의하여 구현의 정#확성과
일관성을 보장합니다.
