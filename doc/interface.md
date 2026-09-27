# Interface (API 인터페이스 문서)

## AI 플랫폼 관리자 대시보드 API 인터페이스 명세서

| 항목 | 내용 |
|------|------|
| 버전 | 2.1.0 |
| 작성일 | 2025-08-12 |
| Base URL | `/api` |

---

## 1. 공통 사항

### 1.1 인증

```typescript
// 모든 /api/admin/* 엔드포인트
headers: {
  'Authorization': `Bearer ${token}`
}

// /api/cms/content, /api/notifications, /api/pwa/*는 인증 불필요
```

### 1.2 공통 응답 타입

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

### 1.3 에러 응답 타입

```typescript
interface ErrorResponse {
  success: false
  error: string
}
```

| 상태 코드 | 의미 |
|----------|------|
| 200 | 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 실패 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 500 | 서버 오류 |

---

## 2. 타입 정의

### 2.1 세션 타입

```typescript
interface Session {
  userId: string
  email: string
  role: 'superadmin' | 'admin' | 'editor' | 'viewer'
  expiresAt: number
}
```

### 2.2 관리자 사용자 타입

```typescript
interface AdminUser {
  id: string
  email: string
  name: string
  role: 'superadmin' | 'admin' | 'editor' | 'viewer'
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

// 생성 요청
interface CreateAdminUserRequest {
  email: string
  name: string
  password: string
  role: 'superadmin' | 'admin' | 'editor' | 'viewer'
}

// 수정 요청
interface UpdateAdminUserRequest {
  id: string
  name?: string
  role?: string
  isActive?: boolean
  password?: string  // 선택: 비밀번호 변경 시
}
```

### 2.3 콘텐츠 타입

```typescript
type ContentCategory = 'home' | 'chat' | 'image' | 'future' | 'quiz' | 'settings' | 'global' | 'nav' | 'general'
type ContentType = 'text' | 'image' | 'rich_text' | 'json' | 'color' | 'url'

interface Content {
  id: string
  key: string
  category: ContentCategory
  type: ContentType
  value: string
  label: string | null
  description: string | null
  sortOrder: number
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

// 생성 요청
interface CreateContentRequest {
  key: string
  category: ContentCategory
  type: ContentType
  value: string
  label?: string
  description?: string
}

// 수정 요청 (ID 기반)
interface UpdateContentByIdRequest {
  id: string
  value?: string
  label?: string
  description?: string
  type?: ContentType
  category?: ContentCategory
  sortOrder?: number
}

// 수정 요청 (키 기반)
interface UpdateContentByKeyRequest {
  value?: string
  label?: string
  description?: string
}
```

### 2.4 권한 타입 (9 필드)

```typescript
type PermissionKey =
  | 'canManageUsers'
  | 'canManageContent'
  | 'canManageConfig'
  | 'canViewAudit'
  | 'canDeleteContent'
  | 'canManageAPIKeys'
  | 'canManageNotifications'
  | 'canExportData'
  | 'canViewAnalytics'

interface Permission {
  id: string
  role: 'superadmin' | 'admin' | 'editor' | 'viewer'
  canManageUsers: boolean
  canManageContent: boolean
  canManageConfig: boolean
  canViewAudit: boolean
  canDeleteContent: boolean
  canManageAPIKeys: boolean
  canManageNotifications: boolean
  canExportData: boolean
  canViewAnalytics: boolean
  createdAt: string
  updatedAt: string
}

// 수정 요청
interface UpdatePermissionRequest {
  role: string
  canManageUsers: boolean
  canManageContent: boolean
  canManageConfig: boolean
  canViewAudit: boolean
  canDeleteContent: boolean
  canManageAPIKeys: boolean
  canManageNotifications: boolean
  canExportData: boolean
  canViewAnalytics: boolean
}
```

### 2.5 감사 로그 타입

```typescript
type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout'
type AuditEntity = 'content' | 'user' | 'config' | 'settings' | 'notification' | 'permission'

interface AuditLog {
  id: string
  userId: string | null
  userEmail: string | null
  action: AuditAction
  entity: AuditEntity
  entityId: string | null
  changes: string | null  // JSON 문자열
  ip: string | null
  createdAt: string
}

// 필터 파라미터
interface AuditLogFilter {
  page?: number      // 기본 1
  limit?: number     // 기본 20
  action?: AuditAction
  entity?: AuditEntity
  userId?: string
}
```

### 2.6 사이트 설정 타입

```typescript
type LayoutMode = 'auto' | 'kiosk-21' | 'kiosk-32' | 'desktop' | 'tablet' | 'mobile'

interface SiteConfig {
  id: string
  siteName: string
  siteDescription: string
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string
  layoutMode: LayoutMode
  language: string
  maintenanceMode: boolean
  updatedAt: string
  createdAt: string
}

// 수정 요청
interface UpdateSiteConfigRequest {
  siteName?: string
  siteDescription?: string
  logoUrl?: string
  faviconUrl?: string
  primaryColor?: string
  layoutMode?: LayoutMode
  language?: string
  maintenanceMode?: boolean
}
```

### 2.7 대시보드 통계 타입

```typescript
interface DashboardStats {
  contentCount: number
  userCount: number
  chatSessionCount: number
  quizResultCount: number
  imageHistoryCount: number
  auditLogCount: number
  activeSessions: number
  notificationCount: number
  activityCount: number
}
```

### 2.8 PWA 타입

```typescript
type PWAInstallStatus = 'installed' | 'not-installed' | 'installable'
type NotificationPermissionStatus = 'default' | 'granted' | 'denied'

interface PWAState {
  isInstalled: boolean
  isInstallable: boolean
  isOffline: boolean
  hasUpdate: boolean
  notificationPermission: NotificationPermissionStatus
  swRegistration: ServiceWorkerRegistration | null
}

interface InstallPrompt {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

// PWA 구독 등록 요청
interface SubscribePushRequest {
  subscription: PushSubscriptionData
  userId?: string
}

// PWA 알림 발송 요청 (관리자)
interface NotifyPushRequest {
  title: string
  body: string
  icon?: string
  url?: string
  targetRole?: 'superadmin' | 'admin' | 'editor' | 'viewer' | 'all'
}
```

### 2.9 알림 (Notification) 타입

```typescript
type NotificationType = 'info' | 'warning' | 'success' | 'error' | 'system'
type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'
type NotificationTargetRole = 'all' | 'superadmin' | 'admin' | 'editor' | 'viewer'

interface AppNotification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  targetRole: NotificationTargetRole
  isRead: boolean
  actionUrl: string | null
  createdAt: string
  updatedAt: string
}

// 알림 생성 요청
interface CreateNotificationRequest {
  type: NotificationType
  priority?: NotificationPriority
  title: string
  message: string
  targetRole?: NotificationTargetRole
  actionUrl?: string
}

// 알림 수정 요청
interface UpdateNotificationRequest {
  id: string
  type?: NotificationType
  priority?: NotificationPriority
  title?: string
  message?: string
  targetRole?: NotificationTargetRole
  isRead?: boolean
  actionUrl?: string | null
}
```

### 2.10 사용자 활동 (UserActivity) 타입

```typescript
type ActivityType = 'page_view' | 'chat_message' | 'image_generate' | 'quiz_answer' | 'setting_change' | 'login' | 'logout'

interface UserActivity {
  id: string
  userId: string | null
  activityType: ActivityType
  details: string | null  // JSON 문자열
  sessionId: string | null
  ip: string | null
  userAgent: string | null
  createdAt: string
}

// 활동 로그 필터
interface ActivityLogFilter {
  page?: number
  limit?: number
  activityType?: ActivityType
  userId?: string
  startDate?: string
  endDate?: string
}
```

### 2.11 콘텐츠 버전 (ContentVersion) 타입

```typescript
interface ContentVersion {
  id: string
  contentId: string
  key: string
  value: string
  version: number
  updatedBy: string | null
  createdAt: string
}
```

### 2.12 온보딩 진행 (OnboardingProgress) 타입

```typescript
type OnboardingStep = 'welcome' | 'profile' | 'first-chat' | 'first-image' | 'first-quiz' | 'complete'

interface OnboardingProgress {
  id: string
  userId: string | null
  currentStep: OnboardingStep
  completedSteps: string  // JSON 배열 문자열
  skipped: boolean
  createdAt: string
  updatedAt: string
}
```

---

## 3. 콘텐츠 키 네이밍 컨벤션

### 3.1 규칙

```
{category}.{section}.{field}
```

- category: 기능 카테고리 (home, chat, image, future, quiz, settings, global, nav)
- section: UI 섹션 (hero, welcome, styles, buttons 등)
- field: 개별 필드 (title, subtitle, description, label, placeholder 등)

### 3.2 예시

| 키 | 카테고리 | 타입 | 설명 |
|----|---------|------|------|
| home.hero.title | home | text | 홈 화면 메인 제목 |
| home.hero.subtitle | home | text | 홈 화면 부제목 |
| home.hero.description | home | text | 홈 화면 설명 |
| home.hero.image | home | image | 홈 화면 히어로 이미지 |
| chat.welcome | chat | text | 채팅 환영 메시지 |
| chat.placeholder | chat | text | 채팅 입력 플레이스홀더 |
| image.styles.watercolor.label | image | text | 수채화 스타일 라벨 |
| image.styles.watercolor.prompt | image | text | 수채화 스타일 프롬프트 |
| future.ages.60.label | future | text | 60대 연령 라벨 |
| quiz.easy.label | quiz | text | 초급 난이도 라벨 |
| quiz.easy.description | quiz | text | 초급 난이도 설명 |
| settings.provider.zai.label | settings | text | 내장 AI 제공자 라벨 |
| global.site.name | global | text | 사이트 이름 |
| global.site.description | global | text | 사이트 설명 |
| global.primaryColor | global | color | 기본 색상 |
| nav.items | nav | json | 네비게이션 항목 배열 |

---

## 4. CMS 콘텐츠 카테고리

| 카테고리 | 설명 | 프론트엔드 사용처 | 대표 키 |
|---------|------|-----------------|---------|
| home | 홈 화면 | HomePage | home.hero.* |
| chat | AI 대화 | ChatPanel | chat.welcome, chat.placeholder |
| image | 이미지 변환 | ImagePanel | image.styles.* |
| future | 미래의 나 | FutureMePanel | future.ages.* |
| quiz | AI 퀴즈 | QuizPanel | quiz.easy.*, quiz.medium.*, quiz.hard.* |
| settings | 설정 | SettingsPanel | settings.provider.* |
| global | 전역 설정 | 모든 페이지 | global.site.*, global.primaryColor |
| nav | 네비게이션 | 헤더/사이드바 | nav.items |
| general | 일반 | 범용 | (키-값 쌍) |

---

## 5. API 엔드포인트 전체 참조

### 5.1 공개 API

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|:----:|
| GET | /api/cms/content | 콘텐츠 키-값 맵 조회 | ❌ |
| GET | /api/cms/content?category=X | 카테고리별 조회 | ❌ |
| GET | /api/notifications | 알림 목록 (공개) | ❌ |

### 5.2 인증 API

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|:----:|
| POST | /api/admin/auth | 로그인 | ❌ |
| DELETE | /api/admin/auth | 로그아웃 | ✅ |
| GET | /api/admin/auth | 세션 확인 | ✅ |

### 5.3 콘텐츠 관리 API

| 메서드 | 엔드포인트 | 설명 | 권한 |
|--------|-----------|------|------|
| GET | /api/admin/content | 콘텐츠 목록 | canManageContent |
| POST | /api/admin/content | 콘텐츠 생성 | canManageContent |
| PUT | /api/admin/content | 콘텐츠 수정 (ID) | canManageContent |
| DELETE | /api/admin/content | 콘텐츠 삭제 (ID) | canDeleteContent |
| GET | /api/admin/content/[key] | 단일 콘텐츠 조회 | canManageContent |
| PUT | /api/admin/content/[key] | 단일 콘텐츠 수정 | canManageContent |
| DELETE | /api/admin/content/[key] | 단일 콘텐츠 삭제 | canDeleteContent |

### 5.4 사용자 관리 API

| 메서드 | 엔드포인트 | 설명 | 권한 |
|--------|-----------|------|------|
| GET | /api/admin/users | 사용자 목록 | canManageUsers |
| POST | /api/admin/users | 사용자 생성 | canManageUsers |
| PUT | /api/admin/users | 사용자 수정 | canManageUsers |
| DELETE | /api/admin/users | 사용자 삭제 | canManageUsers |

### 5.5 권한 관리 API

| 메서드 | 엔드포인트 | 설명 | 권한 |
|--------|-----------|------|------|
| GET | /api/admin/roles | 권한 목록 | canManageUsers |
| PUT | /api/admin/roles | 권한 수정 | canManageUsers (superadmin) |
| GET | /api/admin/permissions | 권한 상세 조회 | canManageUsers |
| PUT | /api/admin/permissions | 권한 수정 | canManageUsers (superadmin) |

### 5.6 감사 로그 API

| 메서드 | 엔드포인트 | 설명 | 권한 |
|--------|-----------|------|------|
| GET | /api/admin/audit | 감사 로그 조회 | canViewAudit |

### 5.7 사이트 설정 API

| 메서드 | 엔드포인트 | 설명 | 권한 |
|--------|-----------|------|------|
| GET | /api/admin/config | 설정 조회 | canManageConfig |
| PUT | /api/admin/config | 설정 수정 | canManageConfig |

### 5.8 대시보드 API

| 메서드 | 엔드포인트 | 설명 | 권한 |
|--------|-----------|------|------|
| GET | /api/admin/stats | 통계 조회 | (인증만) |

### 5.9 PWA API

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|:----:|
| POST | /api/pwa/subscribe | 푸시 알림 구독 등록/해지 | ❌ |
| POST | /api/pwa/notify | 푸시 알림 발송 | ✅ (관리자) |

#### 5.9.1 POST /api/pwa/subscribe

```typescript
// 요청
interface SubscribePushRequest {
  subscription: PushSubscriptionData  // PushSubscription.toJSON()
  userId?: string
}

// 응답
ApiResponse<{ subscribed: boolean }>
```

#### 5.9.2 POST /api/pwa/notify

```typescript
// 요청
interface NotifyPushRequest {
  title: string
  body: string
  icon?: string
  url?: string
  targetRole?: NotificationTargetRole  // 기본 'all'
}

// 응답
ApiResponse<{ sent: number; failed: number }>
```

### 5.10 알림 관리 API

| 메서드 | 엔드포인트 | 설명 | 권한 |
|--------|-----------|------|------|
| GET | /api/admin/notifications | 알림 목록 | canManageNotifications |
| POST | /api/admin/notifications | 알림 생성 | canManageNotifications |
| PUT | /api/admin/notifications | 알림 수정 | canManageNotifications |
| DELETE | /api/admin/notifications | 알림 삭제 | canManageNotifications |

#### 5.10.1 GET /api/admin/notifications

```typescript
// 쿼리 파라미터
interface NotificationFilter {
  page?: number
  limit?: number
  type?: NotificationType
  priority?: NotificationPriority
  targetRole?: NotificationTargetRole
}

// 응답
PaginatedResponse<AppNotification>
```

#### 5.10.2 POST /api/admin/notifications

```typescript
// 요청: CreateNotificationRequest
// 응답: ApiResponse<AppNotification>
```

#### 5.10.3 PUT /api/admin/notifications

```typescript
// 요청: UpdateNotificationRequest
// 응답: ApiResponse<AppNotification>
```

### 5.11 사용자 활동 로그 API

| 메서드 | 엔드포인트 | 설명 | 권한 |
|--------|-----------|------|------|
| GET | /api/admin/activity | 활동 로그 조회 | canViewAnalytics |

#### 5.11.1 GET /api/admin/activity

```typescript
// 쿼리 파라미터: ActivityLogFilter
// 응답: PaginatedResponse<UserActivity>
```

### 5.12 모의 데이터 관리 API

| 메서드 | 엔드포인트 | 설명 | 권한 |
|--------|-----------|------|------|
| GET | /api/admin/mock | 모의 데이터 상태 조회 | canManageConfig |
| POST | /api/admin/mock | 모의 데이터 시드 (생성) | canManageConfig |
| DELETE | /api/admin/mock | 모의 데이터 초기화 (삭제) | canManageConfig |

#### 5.12.1 GET /api/admin/mock

```typescript
// 응답
ApiResponse<{
  seeded: boolean
  models: Record<string, number>  // 모델명 → 레코드 수
}>
```

#### 5.12.2 POST /api/admin/mock

```typescript
// 요청
interface SeedMockRequest {
  models?: string[]  // 시드할 모델 목록 (빈 배열 = 전체)
  count?: number     // 모델당 레코드 수 (기본 10)
}

// 응답
ApiResponse<{ seeded: Record<string, number> }>
```

#### 5.12.3 DELETE /api/admin/mock

```typescript
// 응답
ApiResponse<{ deleted: Record<string, number> }>
```

---

## 6. API 엔드포인트 전체 참조표

| 메서드 | 엔드포인트 | 설명 | 인증 | 권한 |
|--------|-----------|------|:----:|------|
| GET | /api/cms/content | 콘텐츠 키-값 맵 | ❌ | — |
| GET | /api/notifications | 공개 알림 목록 | ❌ | — |
| POST | /api/pwa/subscribe | 푸시 구독 등록 | ❌ | — |
| POST | /api/pwa/notify | 푸시 알림 발송 | ✅ | 관리자 |
| POST | /api/admin/auth | 로그인 | ❌ | — |
| DELETE | /api/admin/auth | 로그아웃 | ✅ | — |
| GET | /api/admin/auth | 세션 확인 | ✅ | — |
| GET | /api/admin/content | 콘텐츠 목록 | ✅ | canManageContent |
| POST | /api/admin/content | 콘텐츠 생성 | ✅ | canManageContent |
| PUT | /api/admin/content | 콘텐츠 수정 | ✅ | canManageContent |
| DELETE | /api/admin/content | 콘텐츠 삭제 | ✅ | canDeleteContent |
| GET | /api/admin/content/[key] | 단일 콘텐츠 조회 | ✅ | canManageContent |
| PUT | /api/admin/content/[key] | 단일 콘텐츠 수정 | ✅ | canManageContent |
| DELETE | /api/admin/content/[key] | 단일 콘텐츠 삭제 | ✅ | canDeleteContent |
| GET | /api/admin/users | 사용자 목록 | ✅ | canManageUsers |
| POST | /api/admin/users | 사용자 생성 | ✅ | canManageUsers |
| PUT | /api/admin/users | 사용자 수정 | ✅ | canManageUsers |
| DELETE | /api/admin/users | 사용자 삭제 | ✅ | canManageUsers |
| GET | /api/admin/roles | 권한 목록 | ✅ | canManageUsers |
| PUT | /api/admin/roles | 권한 수정 | ✅ | canManageUsers |
| GET | /api/admin/permissions | 권한 상세 조회 | ✅ | canManageUsers |
| PUT | /api/admin/permissions | 권한 수정 | ✅ | canManageUsers |
| GET | /api/admin/audit | 감사 로그 | ✅ | canViewAudit |
| GET | /api/admin/config | 사이트 설정 조회 | ✅ | canManageConfig |
| PUT | /api/admin/config | 사이트 설정 수정 | ✅ | canManageConfig |
| GET | /api/admin/stats | 대시보드 통계 | ✅ | — |
| GET | /api/admin/notifications | 알림 목록 | ✅ | canManageNotifications |
| POST | /api/admin/notifications | 알림 생성 | ✅ | canManageNotifications |
| PUT | /api/admin/notifications | 알림 수정 | ✅ | canManageNotifications |
| DELETE | /api/admin/notifications | 알림 삭제 | ✅ | canManageNotifications |
| GET | /api/admin/activity | 활동 로그 | ✅ | canViewAnalytics |
| GET | /api/admin/mock | 모의 데이터 조회 | ✅ | canManageConfig |
| POST | /api/admin/mock | 모의 데이터 시드 | ✅ | canManageConfig |
| DELETE | /api/admin/mock | 모의 데이터 초기화 | ✅ | canManageConfig |
