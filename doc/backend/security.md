# Security Design (보안 설계)

> 본 문서는 시니어 사용자 디지털 복지 서비스 플랫폼의 전체 보안 설계를 설명합니다.
> 인증, 인가, API 보안, PII 마스킹, 감사 로깅, 세션 관리, 비밀번호 정책, XSS/CSRF 방어를 포함합니다.

---

## 1. Authentication (인증)

### 1.1 비밀번호 해싱 — bcrypt

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;  // 비용 인수 (cost factor)

// 비밀번호 해싱
async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// 비밀번호 검증
async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- **알고리즘**: bcrypt (Blowfish 기반)
- **Salt Rounds**: 12 (약 250ms 해싱 시간, 2025년 기준 적절)
- **비밀번호 길이 제한**: 최대 72바이트 (bcrypt 제한, 초과분 무시 주의)

### 1.2 In-memory 세션 스토어

```typescript
interface Session {
  sessionId: string;        // 암호화된 세션 식별자
  userId: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: number;        // 타임스탬프 (ms)
  expiresAt: number;        // 타임스탬프 (ms)
  lastActivityAt: number;   // 마지막 활동 시간
  ipAddress: string;        // 생성 시 IP
  userAgent: string;        // 생성 시 User-Agent
}

// Map 기반 세션 스토어 (서버 메모리)
const sessionStore = new Map<string, Session>();
```

### 1.3 Bearer Token 인증

```
Authorization: Bearer <encrypted_session_id>
```

- **토큰 형식**: HMAC-SHA256 서명된 세션 ID
- **서명 키**: 서버 시작 시 생성되는 256비트 랜덤 키
- **토큰 구조**: `base64(sessionId) + "." + base64(hmac)`
- **검증 흐름**: 서명 검증 → 세션 스토어 조회 → 만료 확인

### 1.4 세션 TTL — 24시간

```typescript
const SESSION_CONFIG = {
  TTL: 24 * 60 * 60 * 1000,        // 24시간 (ms)
  EXTEND_ON_ACTIVITY: true,         // 활동 시 자동 연장
  MAX_SESSIONS_PER_USER: 3,         // 사용자당 최대 세션 수
  CLEANUP_INTERVAL: 60 * 60 * 1000, // 1시간마다 만료 세션 정리
};

// 만료 세션 자동 정리
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessionStore) {
    if (now > session.expiresAt) {
      sessionStore.delete(token);
    }
  }
}, SESSION_CONFIG.CLEANUP_INTERVAL);
```

---

## 2. Authorization (인가) — RBAC

### 2.1 역할 정의 (4개 역할)

| 역할 | 설명 | 권한 수 |
|------|------|---------|
| `super_admin` | 최고 관리자 — 시스템 전체 권한 | 9 (전체) |
| `admin` | 관리자 — 사용자/콘텐츠 관리 | 7 |
| `editor` | 편집자 — 콘텐츠 작성/수정 | 4 |
| `viewer` | 열람자 — 읽기 전용 | 2 |

### 2.2 권한 정의 (9개 권한)

```typescript
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'content:read', 'content:write', 'content:delete', 'content:publish',
    'user:read', 'user:write', 'user:delete',
    'admin:access', 'audit:read',
  ],
  admin: [
    'content:read', 'content:write', 'content:delete', 'content:publish',
    'user:read', 'user:write',
    'admin:access',
  ],
  editor: [
    'content:read', 'content:write',
    'admin:access',
  ],
  viewer: [
    'content:read',
    'admin:access',   // 제한된 관리자 화면 열람
  ],
};
```

### 2.3 권한 검증 미들웨어

```typescript
function requirePermission(permission: Permission) {
  return async (request: Request, session: Session) => {
    const userPermissions = ROLE_PERMISSIONS[session.role];
    if (!userPermissions.includes(permission)) {
      throw new AuthorizationError(
        `권한이 없습니다: ${permission}`,
        403
      );
    }
  };
}

// 사용 예시
app.patch('/api/admin/users/:id/role',
  requirePermission('user:write'),
  handler
);
```

---

## 3. API Security (API 보안)

### 3.1 CORS 설정

```typescript
const CORS_CONFIG = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://senior-welfare.example.com']
    : ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Request-Id'],
  credentials: true,
  maxAge: 86400,  // preflight 캐시 24시간
};
```

### 3.2 Rate Limiting (요청 빈도 제한)

```typescript
interface RateLimitConfig {
  windowMs: number;      // 시간 윈도우 (ms)
  maxRequests: number;   // 윈도우 내 최대 요청 수
}

const RATE_LIMITS = {
  // 일반 API
  'default':      { windowMs: 60_000,   maxRequests: 60 },    // 60/min
  // 인증 API (엄격)
  'auth/login':   { windowMs: 15 * 60_000, maxRequests: 5 },  // 5/15min
  'auth/session': { windowMs: 60_000,   maxRequests: 30 },    // 30/min
  // AI 챗봇 (중간)
  'chat/message': { windowMs: 60_000,   maxRequests: 10 },    // 10/min
  // 콘텐츠 관리
  'cms/contents': { windowMs: 60_000,   maxRequests: 30 },    // 30/min
  // 관리자 API
  'admin':        { windowMs: 60_000,   maxRequests: 20 },    // 20/min
};
```

### 3.3 Input Validation (입력 값 검증)

```typescript
import { z } from 'zod';

// 로그인 요청 검증
const LoginSchema = z.object({
  username: z.string()
    .min(3, '사용자명은 최소 3자입니다')
    .max(50, '사용자명은 최대 50자입니다')
    .regex(/^[a-zA-Z0-9_]+$/, '영문, 숫자, 밑줄만 사용 가능합니다'),
  password: z.string()
    .min(8, '비밀번호는 최소 8자입니다')
    .max(128, '비밀번호는 최대 128자입니다'),
});

// 콘텐츠 작성 검증
const ContentSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(50000),
  category: z.enum(['welfare', 'health', 'legal', 'education']),
  tags: z.array(z.string().max(50)).max(10).optional(),
  priority: z.number().int().min(1).max(5).optional(),
});

// 채팅 메시지 검증
const ChatMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().uuid(),
});
```

### 3.4 Prompt Injection Detection (프롬프트 인젝션 탐지)

```typescript
const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /system\s*:/i,
  /你\s*是/i,                          // 중국어 프롬프트 인젝션
  /새로운\s*지시\s*사항/i,              // 한국어 프롬프트 인젝션
  /role\s*:\s*system/i,
  /<\s*script/i,
  /\b(eval|exec|function)\s*\(/i,
];

function detectPromptInjection(input: string): { safe: boolean; score: number } {
  let score = 0;
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) score += 1;
  }
  return {
    safe: score === 0,
    score,   // 0 = 안전, 1+ = 의심, 3+ = 차단
  };
}
```

---

## 4. PII Masking (개인식별정보 마스킹)

```typescript
interface MaskingRule {
  pattern: RegExp;
  replacement: (match: string) => string;
}

const PII_MASKING_RULES: MaskingRule[] = [
  // 주민등록번호
  {
    pattern: /\d{6}-\d{7}/g,
    replacement: (m) => m.slice(0, 6) + '-*******',
  },
  // 전화번호
  {
    pattern: /01[016789]-\d{3,4}-\d{4}/g,
    replacement: (m) => m.slice(0, 3) + '-****-' + m.slice(-4),
  },
  // 이메일
  {
    pattern: /[\w.]+@[\w.]+\.\w+/g,
    replacement: (m) => m[0] + '***@' + m.split('@')[1],
  },
  // 계좌번호
  {
    pattern: /\d{3,6}-\d{2,6}-\d{2,6}/g,
    replacement: (m) => '***-****-' + m.slice(-4),
  },
];

function maskPII(text: string): string {
  let result = text;
  for (const rule of PII_MASKING_RULES) {
    result = result.replace(rule.pattern, rule.replacement);
  }
  return result;
}
```

---

## 5. Audit Logging (감사 로깅)

### 5.1 로깅 대상 이벤트

| 카테고리 | 이벤트 | 레벨 |
|----------|--------|------|
| 인증 | `auth.login`, `auth.logout`, `auth.failed` | INFO |
| 인증 | `auth.token_expired`, `auth.session_invalid` | WARN |
| 콘텐츠 | `content.create`, `content.update`, `content.delete` | INFO |
| 콘텐츠 | `content.publish`, `content.unpublish` | INFO |
| 사용자 | `user.create`, `user.role_change`, `user.lock` | WARN |
| 관리자 | `admin.permission_denied` | WARN |
| 보안 | `security.injection_detected`, `security.rate_limit_exceeded` | ERROR |

### 5.2 로그 구조

```typescript
interface AuditLog {
  id: string;
  timestamp: string;          // ISO 8601
  level: 'INFO' | 'WARN' | 'ERROR';
  action: string;             // 'content.create'
  userId: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  requestId: string;          // 요청 추적 ID
}
```

---

## 6. Session Management (세션 관리)

- **저장소**: In-memory Map (외부 Redis 없음)
- **동시 세션 제한**: 사용자당 3개
- **비활성 타임아웃**: 30분 (일반), 15분 (키오스크)
- **절대 타임아웃**: 24시간
- **세션 갱신**: 활동 시 자동 연장 (sliding window)
- **강제 종료**: 관리자가 특정 사용자 세션 일괄 삭제 가능
- **서버 재시작**: 모든 세션 초기화 (재로그인 필요)

---

## 7. Password Policies (비밀번호 정책)

```typescript
const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,      // 대문자 필수
  requireLowercase: true,      // 소문자 필수
  requireNumber: true,         // 숫자 필수
  requireSpecial: true,        // 특수문자 필수
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  historyCount: 5,             // 최근 5개 비밀번호 재사용 금지
  maxAge: 90 * 24 * 60 * 60,  // 90일 후 변경 권장
  lockoutThreshold: 5,         // 5회 실패 후 계정 잠금
  lockoutDuration: 30 * 60,    // 30분 잠금
};

function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (password.length < PASSWORD_POLICY.minLength)
    errors.push(`${PASSWORD_POLICY.minLength}자 이상이어야 합니다`);
  if (!/[A-Z]/.test(password))
    errors.push('대문자를 포함해야 합니다');
  if (!/[a-z]/.test(password))
    errors.push('소문자를 포함해야 합니다');
  if (!/[0-9]/.test(password))
    errors.push('숫자를 포함해야 합니다');
  if (!new RegExp(`[${PASSWORD_POLICY.specialChars}]`).test(password))
    errors.push('특수문자를 포함해야 합니다');

  return { valid: errors.length === 0, errors };
}
```

---

## 8. XSS Prevention (XSS 방어)

```typescript
// 1. 출력 인코딩 — React의 JSX는 기본적으로 이스케이프 처리
// 2. dangerouslySetInnerHTML 사용 금지 (ESLint 규칙)
// 3. Content Security Policy 헤더
const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'nonce-{nonce}'",
  "style-src 'self' 'unsafe-inline'",      // Tailwind 필요
  "img-src 'self' data: https:",
  "connect-src 'self' wss:",
  "font-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// 4. 입력 정화 — 사용자 입력 HTML 제거
import sanitizeHtml from 'sanitize-html';

function sanitizeInput(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],          // 모든 HTML 태그 제거
    allowedAttributes: {},
  });
}
```

## 9. CSRF Prevention (CSRF 방어)

```typescript
// 1. SameSite 쿠키 속성
const COOKIE_CONFIG = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,   // CSRF 방어
  path: '/',
  maxAge: 86400,                 // 24시간
};

// 2. 커스텀 헤더 검증 (Bearer 토큰 방식이므로 자동 방어)
// CSRF 공격은 커스텀 헤더(Authorization)를 설정할 수 없으므로
// Bearer 토큰 기반 인증은 기본적으로 CSRF에 안전

// 3. Origin 검증
function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const allowed = process.env.ALLOWED_ORIGINS?.split(',') || [];
  return !origin || allowed.includes(origin);
}
```

---

## 10. PWA 보안 (Progressive Web App Security)

### 10.1 서비스 워커 보안

| 항목 | 구현 | 상태 |
|------|------|------|
| SW Scope 제한 | `scope: '/'`로 제한, 상위 경로 접근 불가 | ✅ |
| HTTPS 강제 | SW는 HTTPS 환경에서만 등록 (localhost 예외) | ✅ |
| 캐시 무결성 | Static 캐시는 버전 해시 기반, 변조 시 갱신 | ✅ |
| 오프라인 페이지 | /offline.html만 폴백, 민감 페이지 캐시 제외 | ✅ |
| API 캐시 TTL | 5분 TTL, 민감 데이터는 no-cache | ✅ |

### 10.2 푸시 알림 보안

| 항목 | 구현 | 상태 |
|------|------|------|
| VAPID 키 | 서버 측 비공개 키, 공개 키만 클라이언트에 제공 | ✅ |
| 구독 검증 | POST /api/pwa/subscribe 인증 필요 | ✅ |
| 발송 권한 | POST /api/pwa/notify 관리자 권한 필요 | ✅ |
| 알림 내용 제한 | 민감 정보(PII) 알림 본문 제외 | ✅ |

### 10.3 TWA 보안 (Trusted Web Activity)

| 항목 | 구현 | 상태 |
|------|------|------|
| Digital Asset Links | 공개 검증 가능한 소유권 증명 | ✅ |
| 패키지 서명 | Android 앱 서명 일치 필요 | ✅ |
| HTTPS 강제 | TWA는 HTTPS 웹 콘텐츠만 로드 | ✅ |
| URL 검증 | 지정된 도메인만 TWA로 열기 | ✅ |

---

## 11. Hydration 안전성 (SSR/CSR 보안)

### 11.1 Hydration Mismatch 방지

| 항목 | 구현 | 상태 |
|------|------|------|
| useClientValue | useSyncExternalStore 기반 SSR/CSR 값 분리 | ✅ |
| useHydrated | 클라이언트 hydration 완료 여부 감지 | ✅ |
| Radix UI 호환 | aria-controls ID mismatch 방지 | ✅ |
| reactStrictMode | PWA/SW 호환성 위해 false 설정 | ✅ |

### 11.2 적용 대상

- use-pwa.ts: isOnline, isInstalled, swRegistration
- use-voice.ts: isSupported
- use-admin-auth.ts: isAuthenticated
- page.tsx: 오프라인 표시, 설치 배너
- PWANotificationManager: 푸시 권한 상태
- PWAInstallBanner: 설치 프롬프트

---

## 12. 보안 체크리스트

| 항목 | 구현 | 상태 |
|------|------|------|
| 비밀번호 해싱 | bcrypt, salt rounds 12 | ✅ |
| 세션 관리 | In-memory Map, TTL 24h | ✅ |
| 토큰 서명 | HMAC-SHA256 | ✅ |
| RBAC | 4역할, 9권한 | ✅ |
| Rate Limiting | 엔드포인트별 차등 적용 | ✅ |
| 입력 검증 | Zod 스키마 | ✅ |
| 프롬프트 인젝션 | 패턴 매칭 탐지 | ✅ |
| PII 마스킹 | 정규식 기반 4종 식별자 | ✅ |
| 감사 로깅 | 전체 API 이벤트 기록 | ✅ |
| XSS 방어 | CSP + 입력 정화 | ✅ |
| CSRF 방어 | SameSite + Bearer 토큰 | ✅ |
| PWA/SW 보안 | HTTPS 강제, 스코프 제한, 캐시 무결성 | ✅ |
| 푸시 알림 보안 | VAPID 키, 인증/인가 검증 | ✅ |
| TWA 보안 | Digital Asset Links, 패키지 서명 | ✅ |
| Hydration 안전성 | useClientValue, useHydrated, StrictMode 조정 | ✅ |

---

*최종 업데이트: 2025-08-12 | 버전: 2.1.0*
