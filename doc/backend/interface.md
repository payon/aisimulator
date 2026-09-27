# Interface Contracts (인터페이스 계약)

> 본 문서는 시니어 사용자 디지털 복지 서비스 플랫폼의 모든 인터페이스 계약을 정의합니다.
> 모든 API, 컴포넌트, Store, Hook, Type 정의를 포함합니다.

---

## 1. API Interface Contracts (API 인터페이스 계약)

### 1.1 인증 API

```typescript
// POST /api/auth/login
interface LoginRequest {
  username: string;    // 최소 3자, 최대 50자
  password: string;    // 최소 8자, 영문+숫자+특수문자
}

interface LoginResponse {
  success: boolean;
  token?: string;          // Bearer token (JWT)
  user?: AuthUser;
  error?: string;
  expiresIn?: number;     // 초 단위 (기본 86400 = 24h)
}

// POST /api/auth/logout
interface LogoutResponse {
  success: boolean;
  message: string;
}

// GET /api/auth/session
interface SessionResponse {
  authenticated: boolean;
  user?: AuthUser;
  expiresAt?: string;     // ISO 8601
}
```

### 1.2 콘텐츠 관리 API

```typescript
// GET /api/cms/contents
interface ContentsRequest {
  category?: string;      // 'welfare' | 'health' | 'legal' | 'education'
  page?: number;          // 기본 1
  limit?: number;         // 기본 20, 최대 100
  search?: string;
}

interface ContentsResponse {
  contents: ContentItem[];
  total: number;
  page: number;
  totalPages: number;
}

// POST /api/cms/contents
interface CreateContentRequest {
  title: string;
  body: string;
  category: string;
  tags?: string[];
  priority?: number;      // 1-5 우선순위
}

interface ContentItem {
  id: string;
  title: string;
  body: string;
  category: string;
  tags: string[];
  priority: number;
  version: number;        // 콘텐츠 버전 관리
  createdAt: string;
  updatedAt: string;
  authorId: string;
}
```

### 1.3 AI 챗봇 API

```typescript
// POST /api/chat/message
interface ChatMessageRequest {
  message: string;        // 최대 1000자
  sessionId: string;      // 대화 세션 ID
  context?: ChatContext;
}

interface ChatMessageResponse {
  reply: string;
  sources?: KnowledgeSource[];
  confidence: number;     // 0.0 ~ 1.0
  suggestions?: string[]; // 추천 질문
}

interface KnowledgeSource {
  title: string;
  url?: string;
  relevance: number;      // 0.0 ~ 1.0
}
```

### 1.4 관리자 API

```typescript
// GET /api/admin/users
interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
}

// PATCH /api/admin/users/:id/role
interface UpdateRoleRequest {
  role: 'super_admin' | 'admin' | 'editor' | 'viewer';
}

// GET /api/admin/audit-logs
interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
}
```

---

## 2. Component Prop Interfaces (컴포넌트 Prop 인터페이스)

```typescript
// 시니어 친화적 버튼
interface SeniorButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';    // xl = 시니어 특화 56px
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  voiceHint?: string;     // TTS 읽어줄 안내 문구
}

// 카드 컴포넌트
interface ContentCardProps {
  item: ContentItem;
  onSelect: (id: string) => void;
  compact?: boolean;
  showCategory?: boolean;
  highlightText?: string;  // 검색어 하이라이트
}

// 음성 입력 버튼
interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language?: 'ko-KR' | 'en-US';
  continuous?: boolean;
  visualFeedback?: boolean;
}

// TTS 재생 버튼
interface SpeechButtonProps {
  text: string;
  rate?: number;           // 0.5 ~ 2.0 (기본 0.8, 시니어 느린 속도)
  pitch?: number;
  lang?: string;
}

// 네비게이션 탭
interface NavTabProps {
  tabs: TabConfig[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  largeTarget?: boolean;   // 48px+ 터치 타겟
}

interface TabConfig {
  id: TabId;
  label: string;
  icon: LucideIcon;
  badge?: number;          // 알림 뱃지 카운트
}
```

---

## 3. Store Interfaces (상태 관리 인터페이스)

### 3.1 Settings Store

```typescript
interface SettingsState {
  // 디스플레이 설정
  fontSize: 'normal' | 'large' | 'xlarge' | 'xxlarge';
  highContrast: boolean;
  reducedMotion: boolean;
  language: 'ko' | 'en';

  // 접근성 설정
  ttsEnabled: boolean;
  ttsRate: number;          // 0.5 ~ 2.0
  voiceInputEnabled: boolean;
  autoReadResponses: boolean;

  // 키오스크 모드
  kioskMode: boolean;
  kioskTimeout: number;     // 분 단위 자동 로그아웃

  // 알림 설정
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

interface SettingsActions {
  setFontSize: (size: SettingsState['fontSize']) => void;
  toggleHighContrast: () => void;
  toggleTTS: () => void;
  setTTSRate: (rate: number) => void;
  toggleVoiceInput: () => void;
  toggleKioskMode: () => void;
  resetToDefaults: () => void;
}

type useSettingsStore = SettingsState & SettingsActions;
```

### 3.2 Admin Store

```typescript
interface AdminState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  permissions: Permission[];
  loading: boolean;
  error: string | null;
}

interface AdminActions {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  hasPermission: (perm: Permission) => boolean;
  clearError: () => void;
}

type useAdminStore = AdminState & AdminActions;
```

### 3.3 Chat Store

```typescript
interface ChatState {
  messages: Message[];
  sessionId: string;
  isLoading: boolean;
  error: string | null;
}

interface ChatActions {
  sendMessage: (text: string) => Promise<void>;
  clearHistory: () => void;
  loadHistory: (sessionId: string) => Promise<void>;
}

type useChatStore = ChatState & ChatActions;
```

---

## 4. Hook Interfaces (훅 인터페이스)

### 4.1 useAdminAuth

```typescript
interface UseAdminAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (req: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
  refreshToken: () => Promise<void>;
}
```

### 4.2 useCmsContent

```typescript
interface UseCmsContentReturn {
  contents: ContentItem[];
  total: number;
  isLoading: boolean;
  error: string | null;
  fetchContents: (params: ContentsRequest) => Promise<void>;
  getContent: (id: string) => Promise<ContentItem>;
  createContent: (data: CreateContentRequest) => Promise<ContentItem>;
  updateContent: (id: string, data: Partial<ContentItem>) => Promise<ContentItem>;
  deleteContent: (id: string) => Promise<void>;
  searchContents: (query: string) => Promise<void>;
}
```

### 4.3 useSpeechSynthesis

```typescript
interface UseSpeechSynthesisReturn {
  speak: (text: string, options?: SpeechOptions) => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setVoice: (voice: SpeechSynthesisVoice) => void;
  setRate: (rate: number) => void;     // 0.5 ~ 2.0
}

interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  onEnd?: () => void;
  onError?: (error: SpeechSynthesisErrorEvent) => void;
}
```

### 4.4 useVoiceInput

```typescript
interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: (options?: VoiceInputOptions) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;             // 브라우저 Web Speech API 지원 여부
  interimTranscript: string;        // 실시간 인식 중인 텍스트
}

interface VoiceInputOptions {
  language?: string;                 // 기본 'ko-KR'
  continuous?: boolean;              // 연속 인식 모드
  interimResults?: boolean;          // 중간 결과 표시
  maxAlternatives?: number;          // 최대 후보 수
  onResult?: (text: string, isFinal: boolean) => void;
}
```

---

## 5. Type Definitions (타입 정의)

### 5.1 열거형 및 식별자 타입

```typescript
// 탭 식별자
type TabId = 'home' | 'chat' | 'image' | 'future' | 'quiz' | 'settings';  // 관리자는 사이드바에서 접근

// 사용자 역할
type UserRole = 'super_admin' | 'admin' | 'editor' | 'viewer';

// 권한
type Permission =
  | 'content:read' | 'content:write' | 'content:delete' | 'content:publish'
  | 'user:read' | 'user:write' | 'user:delete'
  | 'admin:access' | 'audit:read'
  | 'notifications:manage' | 'data:export' | 'analytics:view';

// PWA 푸시 구독
type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

// Mock 모드 상태
type MockModeState = {
  isEnabled: boolean;
  providers: Record<string, boolean>;
};

// 콘텐츠 카테고리
type ContentCategory = 'welfare' | 'health' | 'legal' | 'education';

// 알림 유형
type NotificationType = 'info' | 'success' | 'warning' | 'error';
```

### 5.2 메시지 타입

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;           // ISO 8601
  metadata?: MessageMetadata;
}

interface MessageMetadata {
  sources?: KnowledgeSource[];
  confidence?: number;
  tokens?: number;             // 토큰 사용량
  model?: string;              // 사용된 AI 모델명
  latencyMs?: number;          // 응답 시간 (ms)
}
```

### 5.3 퀴즈/설문 타입

```typescript
interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'scale' | 'text';
  options?: QuizOption[];
  correctAnswer?: string | number;
  explanation?: string;        // 정답 해설
  points?: number;
  required: boolean;
}

interface QuizOption {
  id: string;
  label: string;
  value: string | number;
  description?: string;        // 옵션 설명 (시니어 친화적)
}

interface QuizResponse {
  quizId: string;
  answers: Record<string, string | number | string[]>;
  completedAt: string;
  score?: number;
}
```

### 5.4 인증 사용자 타입

```typescript
interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  permissions: Permission[];
  lastLoginAt: string;
  createdAt: string;
}

interface AdminUser extends AuthUser {
  email: string;
  isActive: boolean;
  loginCount: number;
  failedLoginAttempts: number;
  lockedUntil?: string;
}
```

### 5.5 감사 로그 타입

```typescript
interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;              // 'content.create', 'user.login', etc.
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}
```

### 5.6 알림 타입

```typescript
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  expiresAt?: string;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notif: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
}
```

### 5.7 PWA 타입

```typescript
interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  swRegistration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  pushPermission: PushSubscription | null;
}

interface PWAConfig {
  vapidPublicKey: string;
  swUrl: string;
  scope: string;
  manifestUrl: string;
}
```

### 5.8 Hydration 안전성 타입

```typescript
// useClientValue: SSR/CSR 값을 안전하게 분리
type UseClientValue = <T>(serverValue: T, getClientValue: () => T) => T;

// useHydrated: 클라이언트 hydration 완료 여부
type UseHydrated = () => boolean;
```

### 5.9 사용자 활동 타입

```typescript
interface UserActivity {
  id: string;
  userId?: string;
  action: string;
  entity: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
  createdAt: string;
}
```

### 5.10 AdminPermission (9개 필드)

```typescript
interface AdminPermission {
  id: string;
  role: string;
  canManageUsers: boolean;
  canManageContent: boolean;
  canManageConfig: boolean;
  canViewAudit: boolean;
  canDeleteContent: boolean;
  canManageAPIKeys: boolean;
  canManageNotifications: boolean;  // v2.1.0 추가
  canExportData: boolean;             // v2.1.0 추가
  canViewAnalytics: boolean;          // v2.1.0 추가
  createdAt: string;
  updatedAt: string;
}
```

---

## 6. API 응답 공통 래퍼

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    requestId: string;
    timestamp: string;
    processingTimeMs: number;
  };
}

interface ApiError {
  code: string;               // 'AUTH_FAILED', 'VALIDATION_ERROR', etc.
  message: string;
  details?: Record<string, string[]>;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

## 7. WebSocket 이벤트 인터페이스

```typescript
// 실시간 동기화 이벤트
interface WSEvent {
  type: 'content.updated' | 'content.created' | 'content.deleted'
      | 'user.login' | 'user.logout'
      | 'notification.new' | 'chat.typing';
  payload: unknown;
  timestamp: string;
  source: string;              // 이벤트 발생 서버/서비스
}

// 클라이언트 → 서버
interface WSClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  channels?: string[];
}

// 서버 → 클라이언트
interface WSServerMessage {
  type: 'event' | 'pong' | 'error';
  data?: WSEvent;
  error?: string;
}
```

---

*최종 업데이트: 2025-01-28 | 버전: 1.0.0*
