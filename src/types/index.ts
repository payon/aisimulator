// === 공통 타입 정의 ===

// 메시지 타입
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  isError?: boolean;
  mockMode?: boolean;
}

// 채팅 관련
export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  currentSessionId: string | null;
  sessions: ChatSessionInfo[];
}

export interface ChatSessionInfo {
  id: string;
  title: string;
  createdAt: string;
  messageCount: number;
}

// 이미지 관련
export type ImageStyle = 'watercolor' | 'oil' | 'cartoon' | 'vintage' | 'anime' | 'pencil';

export interface ImageStyleOption {
  id: ImageStyle;
  label: string;
  emoji: string;
  description: string;
}

export const IMAGE_STYLES: ImageStyleOption[] = [
  { id: 'watercolor', label: '수채화', emoji: '🎨', description: '부드러운 수채화 느낌으로 변환' },
  { id: 'oil', label: '유화', emoji: '🖌️', description: '유화풍의 질감으로 변환' },
  { id: 'cartoon', label: '만화', emoji: '✏️', description: '만화 캐릭터처럼 변환' },
  { id: 'vintage', label: '빈티지', emoji: '📸', description: '옛날 사진 느낌으로 변환' },
  { id: 'anime', label: '애니메이션', emoji: '🌸', description: '애니메이션 캐릭터처럼 변환' },
  { id: 'pencil', label: '연필 스케치', emoji: '✍️', description: '연필로 그린 듯한 느낌' },
];

// 미래의 나 관련
export interface AgeOption {
  age: number;
  label: string;
  emoji: string;
}

export const AGE_OPTIONS: AgeOption[] = [
  { age: 60, label: '60대', emoji: '👨‍🦳' },
  { age: 70, label: '70대', emoji: '👴' },
  { age: 80, label: '80대', emoji: '🧓' },
  { age: 90, label: '90대', emoji: '👵' },
];

// 퀴즈 관련
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: Difficulty;
  category: string;
}

export interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  answers: number[];
  difficulty: Difficulty;
  score: number;
  isCompleted: boolean;
  isLoading: boolean;
}

// 프롬프트 학습 관련
export interface PromptLesson {
  id: string;
  title: string;
  description: string;
  level: number;
  content: string;
  examples?: string;
}

// AI 윤리 관련
export interface EthicsQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// AI 구별 관련
export interface AIDistinctionQuestion {
  id: number;
  question: string;
  hint: string;
  answer: boolean;
  explanation: string;
}

// 접근성 관련
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

export interface AccessibilitySettings {
  fontSize: FontSize;
  highContrast: boolean;
  voiceEnabled: boolean;
  readingSpeed: number;
  touchTargetLarge: boolean;
}

// 네비게이션 탭
export type TabId =
  | 'home'
  | 'chat'
  | 'image'
  | 'future'
  | 'quiz'
  | 'guide'
  | 'services'
  | 'appguide'
  | 'practice'
  | 'settings';

export interface TabInfo {
  id: TabId;
  label: string;
  emoji: string;
  description: string;
}

export const TABS: TabInfo[] = [
  { id: 'home', label: '홈', emoji: '🏠', description: 'AI 플랫폼 메인 화면' },
  { id: 'chat', label: 'AI 대화', emoji: '💬', description: 'AI와 대화하기' },
  { id: 'guide', label: 'AI 기초 안내', emoji: '📖', description: '생성형 AI 기초와 활용 방법' },
  { id: 'services', label: 'AI 서비스 소개', emoji: '🤖', description: '대표 생성형 AI 서비스 소개' },
  { id: 'appguide', label: '앱 설치 안내', emoji: '📱', description: '스마트폰 앱 설치와 기본 이용법' },
  { id: 'practice', label: '질문 체험', emoji: '🙋', description: '예시 질문으로 답변 과정 체험' },
  { id: 'image', label: '이미지 변환', emoji: '🖼️', description: 'AI로 이미지 변환' },
  { id: 'future', label: '미래의 나', emoji: '🔮', description: '미래의 내 모습 보기' },
  { id: 'quiz', label: 'AI 퀴즈', emoji: '📝', description: 'AI 지식 퀴즈' },
  { id: 'settings', label: '설정', emoji: '⚙️', description: 'API 키 및 설정' },
];

// API 응답 타입
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 알림 관련
export type NotificationType = 'info' | 'warning' | 'success' | 'error';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface AppNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

// 사용자 활동
export interface UserActivity {
  id: string;
  userId?: string;
  action: string;
  entity: string;
  metadata?: string;
  createdAt: string;
}

// 접근성 레벨
export type AccessibilityLevel = 'normal' | 'senior' | 'high-contrast';

// 관리자 권한 (확장)
export interface AdminPermission {
  canManageUsers: boolean;
  canManageContent: boolean;
  canManageConfig: boolean;
  canViewAudit: boolean;
  canDeleteContent: boolean;
  canManageAPIKeys: boolean;
  canManageNotifications: boolean;
  canExportData: boolean;
  canViewAnalytics: boolean;
}

// 퀵 액션
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  tabId: TabId;
  description: string;
}

// 예시 질문 체험(프랙티스) 관련
export interface PracticeExample {
  id: string;
  question: string;
  hint?: string;
}

export interface PracticeExchange {
  question: string;
  answer: string;
  mockMode?: boolean;
}
