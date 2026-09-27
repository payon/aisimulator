import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TabId, FontSize, Message, QuizQuestion, Difficulty } from '@/types';

// === 설정 스토어 ===
interface SettingsState {
  fontSize: FontSize;
  highContrast: boolean;
  voiceEnabled: boolean;
  readingSpeed: number;
  touchTargetLarge: boolean;
  language: string;
  langCustomized: boolean;
  setFontSize: (size: FontSize) => void;
  toggleHighContrast: () => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setReadingSpeed: (speed: number) => void;
  setTouchTargetLarge: (large: boolean) => void;
  setLanguage: (lang: string, customized?: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fontSize: 'large',
      highContrast: false,
      voiceEnabled: true,
      readingSpeed: 0.8,
      touchTargetLarge: true,
      language: 'ko',
      langCustomized: false,
      setFontSize: (size) => set({ fontSize: size }),
      toggleHighContrast: () => set((state) => ({ highContrast: !state.highContrast })),
      setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),
      setReadingSpeed: (speed) => set({ readingSpeed: speed }),
      setTouchTargetLarge: (large) => set({ touchTargetLarge: large }),
      setLanguage: (language, customized = true) => set({ language, langCustomized: customized }),
    }),
    { name: 'senior-settings' }
  )
);

// === 네비게이션 스토어 ===
interface NavigationState {
  activeTab: TabId;
  previousTab: TabId | null;
  isTransitioning: boolean;
  setActiveTab: (tab: TabId) => void;
  goBack: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeTab: 'home',
  previousTab: null,
  isTransitioning: false,
  setActiveTab: (tab) =>
    set((state) => ({
      previousTab: state.activeTab,
      activeTab: tab,
      isTransitioning: true,
    })),
  goBack: () =>
    set((state) => ({
      activeTab: state.previousTab || 'home',
      previousTab: null,
      isTransitioning: true,
    })),
}));

// === 채팅 스토어 ===
interface ChatState {
  messages: Message[];
  isLoading: boolean;
  currentSessionId: string | null;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
  setSessionId: (id: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  currentSessionId: null,
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setLoading: (isLoading) => set({ isLoading }),
  clearMessages: () => set({ messages: [], currentSessionId: null }),
  setSessionId: (id) => set({ currentSessionId: id }),
}));

// === 퀴즈 스토어 ===
interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  answers: number[];
  difficulty: Difficulty;
  score: number;
  isCompleted: boolean;
  isLoading: boolean;
  setQuestions: (questions: QuizQuestion[]) => void;
  setCurrentIndex: (index: number) => void;
  addAnswer: (answer: number) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setCompleted: (completed: boolean) => void;
  setLoading: (loading: boolean) => void;
  resetQuiz: () => void;
  calculateScore: () => number;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  questions: [],
  currentIndex: 0,
  answers: [],
  difficulty: 'easy',
  score: 0,
  isCompleted: false,
  isLoading: false,
  setQuestions: (questions) => set({ questions }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  addAnswer: (answer) =>
    set((state) => ({ answers: [...state.answers, answer] })),
  setDifficulty: (difficulty) => set({ difficulty }),
  setCompleted: (isCompleted) => set({ isCompleted }),
  setLoading: (isLoading) => set({ isLoading }),
  resetQuiz: () =>
    set({ questions: [], currentIndex: 0, answers: [], score: 0, isCompleted: false }),
  calculateScore: () => {
    const { answers, questions } = get();
    return answers.reduce((acc, answer, idx) => {
      return acc + (answer === questions[idx]?.correctAnswer ? 1 : 0);
    }, 0);
  },
}));

// === 접근성 패널 스토어 ===
interface AccessibilityPanelState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useAccessibilityPanelStore = create<AccessibilityPanelState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));

// === 가이드 투어 스토어 ===
interface GuideTourState {
  completed: boolean;
  active: boolean;
  currentStep: number;
  showWelcome: boolean;
  start: () => void;
  stop: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: number) => void;
  complete: () => void;
  reset: () => void;
  openWelcome: () => void;
  closeWelcome: () => void;
}

export const useGuideTourStore = create<GuideTourState>()(
  persist(
    (set, get) => ({
      completed: false,
      active: false,
      currentStep: 0,
      showWelcome: false,
      start: () => set({ active: true, currentStep: 0, showWelcome: false }),
      stop: () => set({ active: false, showWelcome: false }),
      nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
      prevStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),
      setStep: (step) => set({ currentStep: step }),
      complete: () => set({ active: false, completed: true, showWelcome: false }),
      reset: () => set({ active: false, completed: false, currentStep: 0, showWelcome: false }),
      openWelcome: () => set({ showWelcome: true }),
      closeWelcome: () => set({ showWelcome: false }),
    }),
    {
      name: 'senior-guide-tour',
      // showWelcome은 세션 상태이므로 영속화 제외
      partialize: (state) => ({
        completed: state.completed,
        active: false,
        currentStep: state.currentStep,
      }) as GuideTourState,
    }
  )
);

// === PWA 스토어 ===
interface PWAState {
  isInstallPromptDismissed: boolean;
  notificationPermissionAsked: boolean;
  offlineQueueCount: number;
  dismissInstallPrompt: () => void;
  setNotificationPermissionAsked: () => void;
  incrementOfflineQueue: () => void;
  clearOfflineQueue: () => void;
}

export const usePWAStore = create<PWAState>()(
  persist(
    (set) => ({
      isInstallPromptDismissed: false,
      notificationPermissionAsked: false,
      offlineQueueCount: 0,
      dismissInstallPrompt: () => set({ isInstallPromptDismissed: true }),
      setNotificationPermissionAsked: () => set({ notificationPermissionAsked: true }),
      incrementOfflineQueue: () => set((state) => ({ offlineQueueCount: state.offlineQueueCount + 1 })),
      clearOfflineQueue: () => set({ offlineQueueCount: 0 }),
    }),
    { name: 'pwa-state' }
  )
);
