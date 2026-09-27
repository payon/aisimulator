# API.MD — API 완전 문서

## AI Platform Backend Admin Dashboard

---

## 1. 개요

### 1.1 Base URL

```
/api  (Caddy Gateway를 통해 Next.js API Routes로 라우팅)
```

### 1.2 공통 헤더

| 헤더 | 필수 | 설명 |
|------|------|------|
| `Content-Type` | O | `application/json` |
| `Cookie` | 관리자 전용 | `admin_token={JWT}` (HttpOnly) |
| `X-Request-ID` | 자동 생성 | 요청 추적 ID |

### 1.3 공통 응답 포맷

```typescript
// 성공 응답
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;       // 전체 건수 (목록 조회 시)
    page?: number;        // 현재 페이지
    limit?: number;       // 페이지당 건수
  };
}

// 에러 응답
interface ErrorResponse {
  success: false;
  error: {
    code: string;         // 에러 코드
    message: string;      // 한국어 사용자 메시지
    detail?: string;      // 개발자 상세 정보
  };
}
```

### 1.4 인증 수준 표기

| 기호 | 의미 |
|------|------|
| 🔓 | 인증 불필요 (공개) |
| 🔑 | 세션 인증 필요 |
| 🛡️ | 관리자 JWT 인증 필요 |
| ⚡ | 권한(permission) 확인 필요 |

---

## 2. AI 기능 API

### 2.1 POST /api/chat

AI 채팅 요청 (Multi-Provider Fallback 지원)

**인증**: 🔓 (Rate Limit 적용)

**요청**:
```typescript
{
  message: string;          // 사용자 메시지 (최대 2000자)
  sessionId?: string;      // 세션 ID (대화 이어가기)
  provider?: string;       // Provider 지정 (기본: 자동 선택)
  temperature?: number;    // 창의성 0.0~1.0 (기본: 0.7)
}
```

**응답**:
```typescript
{
  success: true;
  data: {
    content: string;       // AI 응답 텍스트
    sessionId: string;     // 세션 ID
    provider: string;      // 응답한 Provider 이름
    tokensUsed: number;    // 사용 토큰 수
  }
}
```

**에러**: `AI_001` ProviderUnavailable | `AI_002` RateLimitExceeded | `AI_005` AllProvidersFailed

---

### 2.2 POST /api/image

AI 이미지 생성 요청

**인증**: 🔓 (Rate Limit 적용)

**요청**:
```typescript
{
  prompt: string;           // 이미지 설명 (최대 500자)
  style?: "natural" | "vivid" | "artistic";  // 스타일 (기본: natural)
  size?: "1024x1024" | "512x512";            // 크기 (기본: 1024x1024)
}
```

**응답**:
```typescript
{
  success: true;
  data: {
    imageUrl: string;      // 생성된 이미지 URL
    provider: string;      // 응답한 Provider
    generationTimeMs: number;  // 생성 소요 시간
  }
}
```

---

### 2.3 POST /api/quiz

AI 퀴즈 생성 요청

**인증**: 🔓

**요청**:
```typescript
{
  topic: string;            // 퀴즈 주제
  difficulty?: "easy" | "medium" | "hard";  // 난이도 (기본: easy)
  count?: number;           // 문항 수 1~10 (기본: 5)
  language?: "ko" | "en";  // 언어 (기본: ko)
}
```

**응답**:
```typescript
{
  success: true;
  data: {
    quizId: string;
    questions: Array<{
      id: number;
      question: string;
      options: string[];       // 4개 보기
      correctIndex: number;    // 정답 인덱스 (0~3)
      explanation: string;     // 해설
    }>;
    provider: string;
  }
}
```

---

### 2.4 POST /api/future-self

미래 자아 시뮬레이션 요청

**인증**: 🔓

**요청**:
```typescript
{
  currentSituation: string;     // 현재 상황 설명
  goals: string[];              // 목표 목록
  timeframe: "1year" | "5years" | "10years";  // 시간 범위
  concerns?: string;            // 고민/걱정
}
```

**응답**:
```typescript
{
  success: true;
  data: {
    futureDescription: string;  // 미래 자아 묘사
    advice: string[];           // 조언 목록
    milestones: string[];       // 이정표 목록
    encouragement: string;     // 격려 메시지
    provider: string;
  }
}
```

---

## 3. 설정 & 콘텐츠 API

### 3.1 GET /api/settings

사용자 설정 조회

**인증**: 🔓

**응답**:
```typescript
{
  success: true;
  data: {
    fontSize: number;            // 폰트 크기 (18~32)
    highContrast: boolean;       // 고대비 모드
    voiceGuidance: boolean;      // 음성 안내
    language: "ko" | "en";      // 언어
    notifications: boolean;      // 알림 수신
    reducedMotion: boolean;      // 애니메이션 축소
  }
}
```

### 3.2 PUT /api/settings

사용자 설정 업데이트

**인증**: 🔑

**요청**: 위 GET 응답의 `data` 필드와 동일 (부분 업데이트 가능)

### 3.3 POST /api/settings

설정 초기화 (기본값으로 리셋)

**인증**: 🔑

---

### 3.4 GET /api/cms/content

CMS 콘텐츠 조회 (공개)

**인증**: 🔓

**쿼리 파라미터**:
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `key` | string | 콘텐츠 키 (예: "notice", "guide") |
| `category` | string | 카테고리 필터 |

**응답**:
```typescript
{
  success: true;
  data: Array<{
    key: string;
    title: string;
    content: string;
    category: string;
    updatedAt: string;
  }>;
}
```

---

### 3.5 GET /api/notifications

알림 목록 조회

**인증**: 🔑

**응답**:
```typescript
{
  success: true;
  data: Array<{
    id: string;
    type: "system" | "content" | "role" | "chat";
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
  }>;
}
```

---

## 4. 관리자 인증 API

### 4.1 POST /api/admin/auth

관리자 로그인

**인증**: 🔓

**요청**:
```typescript
{
  username: string;
  password: string;
}
```

**응답**:
```typescript
{
  success: true;
  data: {
    token: string;           // JWT (HttpOnly Cookie로 설정)
    user: {
      id: string;
      username: string;
      role: string;
      permissions: string[];
    };
    expiresAt: string;       // 만료 시각 (ISO 8601)
  }
}
```

**에러**: `AUTH_001` InvalidCredentials | `AUTH_002` AccountLocked

---

## 5. 관리자 사용자 관리 API

### 5.1 GET /api/admin/users

사용자 목록 조회

**인증**: 🛡️ + ⚡ `users.read`

**쿼리 파라미터**: `page`, `limit`, `search`, `role`, `status`

**응답**:
```typescript
{
  success: true;
  data: Array<{
    id: string;
    username: string;
    email: string;
    role: string;
    status: "active" | "inactive" | "locked";
    lastLoginAt: string | null;
    createdAt: string;
  }>;
  meta: { total: number; page: number; limit: number; }
}
```

### 5.2 POST /api/admin/users

사용자 생성

**인증**: 🛡️ + ⚡ `users.create`

**요청**:
```typescript
{
  username: string;
  email: string;
  password: string;
  role: string;
}
```

### 5.3 PUT /api/admin/users

사용자 정보 수정

**인증**: 🛡️ + ⚡ `users.update`

**요청**:
```typescript
{
  id: string;
  username?: string;
  email?: string;
  role?: string;
  status?: "active" | "inactive" | "locked";
}
```

### 5.4 DELETE /api/admin/users

사용자 삭제 (소프트 삭제)

**인증**: 🛡️ + ⚡ `users.delete`

**요청**: `{ id: string }`

---

## 6. 관리자 콘텐츠 관리 API

### 6.1 GET /api/admin/content

관리용 콘텐츠 목록 조회 (버전 정보 포함)

**인증**: 🛡️ + ⚡ `content.read`

### 6.2 POST /api/admin/content

콘텐츠 생성

**인증**: 🛡️ + ⚡ `content.create`

**요청**:
```typescript
{
  key: string;
  title: string;
  content: string;
  category: string;
  status: "draft" | "published";
}
```

### 6.3 PUT /api/admin/content

콘텐츠 수정

**인증**: 🛡️ + ⚡ `content.update`

### 6.4 DELETE /api/admin/content

콘텐츠 삭제

**인증**: 🛡️ + ⚡ `content.delete`

---

## 7. 관리자 역할/권한 API

### 7.1 GET /api/admin/roles

역할 목록 조회

**인증**: 🛡️ + ⚡ `roles.read`

**응답**:
```typescript
{
  success: true;
  data: Array<{
    id: string;
    name: string;
    displayName: string;
    permissions: string[];
    userCount: number;
  }>;
}
```

### 7.2 GET /api/admin/permissions

권한 목록 조회

**인증**: 🛡️

**응답**:
```typescript
{
  success: true;
  data: Array<{
    id: string;
    name: string;           // "users.read"
    displayName: string;    // "사용자 조회"
    category: string;       // "users" | "content" | "roles" | "system"
  }>;
}
```

### 7.3 PUT /api/admin/permissions

역할의 권한 수정

**인증**: 🛡️ + ⚡ `roles.update`

**요청**:
```typescript
{
  roleId: string;
  permissions: string[];    // 권한 이름 배열
}
```

---

## 8. 관리자 설정 API

### 8.1 GET /api/admin/config

사이트 설정 조회

**인증**: 🛡️

**응답**:
```typescript
{
  success: true;
  data: {
    siteName: string;
    siteDescription: string;
    defaultFontSize: number;
    defaultLanguage: string;
    aiProviders: Array<{
      name: string;
      enabled: boolean;
      priority: number;
      apiKey: string;       // 마스킹 처리
    }>;
    rateLimits: {
      user: number;
      admin: number;
    };
    maintenanceMode: boolean;
  }
}
```

### 8.2 PUT /api/admin/config

사이트 설정 수정

**인증**: 🛡️ + ⚡ `system.config`

**요청**: 위 GET 응답의 `data` 필드와 동일 (부분 업데이트 가능)

---

## 9. 관리자 감사/통계 API

### 9.1 GET /api/admin/audit

감사 로그 조회

**인증**: 🛡️ + ⚡ `audit.read`

**쿼리 파라미터**: `page`, `limit`, `userId`, `action`, `from`, `to`

**응답**:
```typescript
{
  success: true;
  data: Array<{
    id: string;
    userId: string;
    username: string;
    action: string;         // "user.create", "content.update" 등
    target: string;         // 대상 리소스
    before: object | null;  // 변경 전 스냅샷
    after: object | null;   // 변경 후 스냅샷
    ip: string;
    timestamp: string;
  }>;
  meta: { total: number; page: number; limit: number; }
}
```

### 9.2 GET /api/admin/stats

대시보드 통계 조회

**인증**: 🛡️

**응답**:
```typescript
{
  success: true;
  data: {
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
    aiCallsToday: number;
    aiTokensToday: number;
    contentItems: number;
    notificationsUnread: number;
    providerHealth: Array<{
      name: string;
      status: "healthy" | "degraded" | "down";
      avgLatencyMs: number;
      errorRate: number;
    }>;
  }
}
```

---

## 10. 관리자 알림 API

### 10.1 GET /api/admin/notifications

관리자 알림 목록 조회

**인증**: 🛡️

### 10.2 POST /api/admin/notifications

알림 생성 (전체 사용자 또는 특정 사용자 대상)

**인증**: 🛡️ + ⚡ `notifications.create`

**요청**:
```typescript
{
  type: "system" | "content" | "role" | "chat";
  title: string;
  message: string;
  targetUsers?: string[];   // 비어있으면 전체 사용자
}
```

### 10.3 PUT /api/admin/notifications

알림 수정

**인증**: 🛡️ + ⚡ `notifications.update`

### 10.4 DELETE /api/admin/notifications

알림 삭제

**인증**: 🛡️ + ⚡ `notifications.delete`

**요청**: `{ id: string }`

---

## 12. PWA API

### 12.1 POST /api/pwa/subscribe

푸시 알림 구독

**인증**: 🔑

**요청**:
```typescript
{
  subscription: PushSubscriptionJSON;  // 브라우저 푸시 구독 객체
}
```

**응답**:
```typescript
{
  success: true;
  data: {
    subscribed: boolean;
    endpoint: string;
  }
}
```

### 12.2 POST /api/pwa/notify

푸시 알림 발송 (관리자)

**인증**: 🛡️ + ⚡ `notifications.create`

**요청**:
```typescript
{
  title: string;
  body: string;
  icon?: string;
  url?: string;
  targetUsers?: string[];
}
```

---

## 13. 관리자 권한 API (9개 권한 필드)

### 13.1 GET /api/admin/permissions

권한 목록 조회 (canManageNotifications, canExportData, canViewAnalytics 포함)

**인증**: 🛡️

### 13.2 PUT /api/admin/permissions/[id]

특정 역할의 권한 수정

**인증**: 🛡️ + ⚡ `roles.update`

---

## 14. 관리자 활동/알림 상세 API

### 14.1 GET /api/admin/activity

최근 활동 내역 조회 (UserActivity 모델)

**인증**: 🛡️

**쿼리 파라미터**: `limit` (기본 50, 최대 200), `userId`, `from`, `to`

### 14.2 GET /api/admin/notifications

관리자 알림 목록 조회

**인증**: 🛡️

### 14.3 PUT /api/admin/notifications/[id]

특정 알림 수정

**인증**: 🛡️ + ⚡ `notifications.update`

### 14.4 DELETE /api/admin/notifications/[id]

특정 알림 삭제

**인증**: 🛡️ + ⚡ `notifications.delete`

---

## 15. 관리자 Mock API

### 15.1 GET /api/admin/mock

Mock 모드 설정 조회

**인증**: 🛡️

### 15.2 POST /api/admin/mock/reset

Mock 데이터 초기화

**인증**: 🛡️ + ⚡ `system.config`

---

## 16. 공개 설정 API

### 16.1 GET /api/config

공개 설정 조회 (사이트 이름, 기본 폰트, PWA 설정 등)

**인증**: 🔓

---

## 11. 관리자 활동 API

### 11.1 GET /api/admin/activity

최근 활동 내역 조회

**인증**: 🛡️

**쿼리 파라미터**: `limit` (기본 50, 최대 200)

**응답**:
```typescript
{
  success: true;
  data: Array<{
    id: string;
    userId: string;
    username: string;
    action: string;
    description: string;
    timestamp: string;
  }>;
}
```

---

## 12. 권한 매트릭스

| 권한 | SuperAdmin | Admin | Editor | Viewer |
|------|:----------:|:-----:|:------:|:------:|
| users.read | ✅ | ✅ | ❌ | ❌ |
| users.create | ✅ | ✅ | ❌ | ❌ |
| users.update | ✅ | ✅ | ❌ | ❌ |
| users.delete | ✅ | ❌ | ❌ | ❌ |
| content.read | ✅ | ✅ | ✅ | ✅ |
| content.create | ✅ | ✅ | ✅ | ❌ |
| content.update | ✅ | ✅ | ✅ | ❌ |
| content.delete | ✅ | ✅ | ❌ | ❌ |
| roles.read | ✅ | ✅ | ❌ | ❌ |
| roles.update | ✅ | ❌ | ❌ | ❌ |
| system.config | ✅ | ✅ | ❌ | ❌ |
| audit.read | ✅ | ✅ | ❌ | ❌ |
| notifications.create | ✅ | ✅ | ✅ | ❌ |
| notifications.update | ✅ | ✅ | ❌ | ❌ |
| notifications.delete | ✅ | ❌ | ❌ | ❌ |
| notifications.manage | ✅ | ✅ | ❌ | ❌ |  ← canManageNotifications
| data.export | ✅ | ✅ | ❌ | ❌ |  ← canExportData
| analytics.view | ✅ | ✅ | ✅ | ✅ |  ← canViewAnalytics

---

## 15. PWA API

### 15.1 POST /api/pwa/subscribe

푸시 알림 구독

**인증**: 🔑

**요청**:
```typescript
{
  subscription: PushSubscriptionJSON;  // 브라우저 푸시 구독 객체
}
```

**응답**:
```typescript
{
  success: true;
  data: {
    subscribed: boolean;
    endpoint: string;
  }
}
```

### 15.2 POST /api/pwa/notify

푸시 알림 발송 (관리자)

**인증**: 🛡️ + ⚡ `notifications.create`

**요청**:
```typescript
{
  title: string;        // 알림 제목
  body: string;         // 알림 본문
  icon?: string;        // 알림 아이콘 URL
  url?: string;         // 클릭 시 이동 URL
  targetUsers?: string[];  // 특정 사용자 (빈 배열 = 전체)
}
```

**응답**:
```typescript
{
  success: true;
  data: {
    sent: number;        // 발송 성공 수
    failed: number;      // 발송 실패 수
  }
}
```

---

## 16. 관리자 권한 API

### 16.1 GET /api/admin/permissions

권한 목록 조회 (9개 필드)

**인증**: 🛡️

### 16.2 PUT /api/admin/permissions/[id]

권한 수정 (canManageNotifications, canExportData, canViewAnalytics 포함)

**인증**: 🛡️ + ⚡ `roles.update`

---

## 17. 관리자 활동/알림 API

### 17.1 GET /api/admin/activity

최근 활동 내역 조회

**인증**: 🛡️

### 17.2 GET /api/admin/notifications

관리자 알림 목록 조회

**인증**: 🛡️

### 17.3 PUT /api/admin/notifications/[id]

알림 수정

**인증**: 🛡️ + ⚡ `notifications.update`

---

## 18. 관리자 Mock API

### 18.1 GET /api/admin/mock

Mock 모드 설정 조회

**인증**: 🛡️

### 18.2 POST /api/admin/mock/reset

Mock 데이터 초기화

**인증**: 🛡️ + ⚡ `system.config`

---

## 19. 설정 API

### 19.1 GET /api/config

공개 설정 조회 (사이트 이름, 기본 폰트 등)

**인증**: 🔓

---

| 코드 | 의미 | 사용 사례 |
|------|------|-----------|
| 200 | 성공 | 모든 GET, 성공한 PUT/DELETE |
| 201 | 생성됨 | POST 성공 (리소스 생성) |
| 400 | 잘못된 요청 | 입력 검증 실패 |
| 401 | 인증 필요 | JWT 누락/만료 |
| 403 | 권한 없음 | 권한 불충분 |
| 404 | 찾을 수 없음 | 리소스 미존재 |
| 429 | 요청 제한 초과 | Rate Limit 초과 |
| 500 | 서버 오류 | 내부 오류 |
| 503 | 서비스 불가 | 모든 AI Provider 장애 |

---

## 14. Rate Limit 정책 요약

| 엔드포인트 그룹 | 제한 | 윈도우 |
|-----------------|------|--------|
| /api/chat, /api/image | 20회 | 1분 (사용자) |
| /api/quiz, /api/future-self | 10회 | 1분 (사용자) |
| /api/admin/* | 200회 | 1분 (관리자) |
| /api/settings, /api/notifications | 60회 | 1분 (인증 사용자) |
| /api/pwa/subscribe, /api/pwa/notify | 30회 | 1분 (인증 사용자) |
| 전체 (IP 기준) | 100회 | 1분 |
