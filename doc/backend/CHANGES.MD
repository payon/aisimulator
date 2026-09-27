# 변경 및 추가 구현 로그

## AI 플랫폼 Backend Admin Dashboard — CHANGES

**최종 수정**: 2025-08-12 | **버전**: v2.1.0

---

## 1. v2.1.0 변경 사항 (2025-08-12)

### 1.1 신규 기능

#### NotificationSystem (알림 시스템)

**파일**: `/src/components/features/NotificationSystem.tsx`  
**설명**: 인앱 알림 시스템으로 관리자가 발행한 공지를 사용자에게 실시간 전달

| 기능 | 설명 |
|------|------|
| 벨 아이콘 + 미읽음 배지 | 읽지 않은 알림 수 표시 |
| Popover 알림 목록 | 클릭 시 드롭다운으로 알림 표시 |
| 타입별 아이콘 | info=ℹ️, warning=⚠️, success=✅, error=❌ |
| 개별/전체 읽음 | 읽음 상태 관리 |
| 전체 삭제 | 알림 목록 비우기 |
| 30초 Polling | 실시간 알림 업데이트 |
| 시간 포맷 | "3분 전", "1시간 전" 한국어 |

#### QuickActionBar (빠른 실행 바)

**파일**: `/src/components/features/QuickActionBar.tsx`  
**설명**: 시니어 사용자를 위한 1클릭 빠른 접근 바

| 기능 | 설명 |
|------|------|
| 5개 액션 버튼 | AI 대화, 이미지 변환, 미래의 나, AI 퀴즈, 설정 |
| 음성 토글 | 마이크 아이콘으로 음성 입력 ON/OFF |
| 수평 스크롤 | 모바일에서 가로 스크롤 |
| Staggered 애니메이션 | Framer Motion 순차 등장 |
| 컬러 코딩 | 각 버튼 고유 색상 |

#### SeniorOnboarding (시니어 온보딩)

**파일**: `/src/components/features/SeniorOnboarding.tsx`  
**설명**: 첫 사용자를 위한 5단계 안내 가이드

| 단계 | 제목 | 내용 |
|------|------|------|
| 1 | 환영합니다 | AI 플랫폼 소개 |
| 2 | AI 대화 | 채팅 기능 설명 |
| 3 | 음성 기능 | 마이크/스피커 사용법 |
| 4 | 글자 크기 | 폰트 크기 조절 안내 |
| 5 | 터치 | 큰 버튼 사용 안내 |

| 기능 | 설명 |
|------|------|
| 진행 바 | 5단계 진행 상태 표시 |
| 이전/다음 | 단계 탐색 |
| 건너뛰기 | 온보딩 건너뛰기 |
| 나중에 | 다음 접속 시 다시 표시 |
| localStorage | 완료 상태 영속 저장 |
| Framer Motion | 단계 전환 애니메이션 |

#### AccessibilityPanel (접근성 패널)

**파일**: `/src/components/features/AccessibilityPanel.tsx`  
**설명**: 시니어 사용자 접근성 설정 슬라이드인 패널

| 기능 | 설명 |
|------|------|
| Sheet (우측 슬라이드인) | Accessibility 아이콘 클릭 시 열림 |
| 폰트 크기 2×2 그리드 | 작게/보통/크게/매우 크게 선택 버튼 |
| 고대비 모드 | Switch 토글, 애니메이션 피드백 |
| TTS (음성 읽기) | Switch + 읽기 속도 슬라이더 (0.5~1.2x) |
| 큰 터치 타겟 | Switch 토글 |
| 초기화 | 시니어 기본값 복원 (large, voice=on, speed=0.8) |
| 활성 표시 | xlarge/고대비 활성 시 트리거에 점 표시 |
| 사용 팁 | 시니어를 위한 접근성 조언 |

---

### 1.2 스키마 변경

#### Notification 모델 (신규)

```prisma
model Notification {
  id          Int      @id @default(autoincrement())
  title       String
  message     String
  type        String   @default("info")
  priority    String   @default("normal")
  isRead      Boolean  @default(false)
  targetRole  String?
  createdAt   DateTime @default(now())
  readAt      DateTime?
}
```

#### UserActivity 모델 (신규)

```prisma
model UserActivity {
  id          Int      @id @default(autoincrement())
  userId      String
  activity    String
  provider    String?
  metadata    String?
  sessionId   String?
  createdAt   DateTime @default(now())
}
```

#### ContentVersion 모델 (신규)

```prisma
model ContentVersion {
  id          Int      @id @default(autoincrement())
  contentId   Int
  value       String
  changedBy   String
  createdAt   DateTime @default(now())
  content     Content  @relation(fields: [contentId], references: [id])
}
```

#### OnboardingProgress 모델 (신규)

```prisma
model OnboardingProgress {
  id           Int       @id @default(autoincrement())
  userId       String
  currentStep  Int       @default(0)
  completed    Boolean   @default(false)
  skipped      Boolean   @default(false)
  completedAt  DateTime?
  updatedAt    DateTime  @updatedAt
}
```

#### Permission 모델 (확장)

3개 권한 필드 추가:
- `canManageNotifications Boolean @default(false)`
- `canExportData Boolean @default(false)`
- `canViewAnalytics Boolean @default(false)`

---

### 1.3 API 변경

#### 신규 엔드포인트

| 엔드포인트 | 메서드 | 설명 | 인증 |
|------------|--------|------|------|
| `/api/notifications` | GET | 공개 알림 조회 | 불필요 |

---

### 1.4 타입 변경

#### types/index.ts

| 변경 | 이전 | 이후 |
|------|------|------|
| TabId | 'home'\|'chat'\|'image'\|'future'\|'quiz'\|'settings'\|'admin' | 'admin' 제거 |
| NotificationType | 없음 | 'info'\|'warning'\|'success'\|'error' |
| NotificationPriority | 없음 | 'low'\|'normal'\|'high'\|'urgent' |
| AppNotification | 없음 | 인터페이스 추가 |
| UserActivity | 없음 | 인터페이스 추가 |
| AccessibilityLevel | 없음 | 인터페이스 추가 |
| AdminPermission | 6개 필드 | 9개 필드 |
| QuickAction | 없음 | 인터페이스 추가 |

---

## 2. v2.0 변경 사항 (요약)

### 2.1 신규 파일

| 파일 | 설명 |
|------|------|
| `/src/lib/admin-auth.ts` | 인증/세션/RBAC |
| `/src/lib/audit.ts` | 감사 로깅 |
| `/src/stores/admin-store.ts` | 관리자 Zustand Store |
| `/src/hooks/use-admin-auth.ts` | 관리자 인증 Hook |
| `/src/components/admin/AdminPanel.tsx` | 관리자 메인 컨테이너 |
| `/src/components/admin/AdminLogin.tsx` | 로그인 폼 |
| `/src/components/admin/AdminDashboard.tsx` | 대시보드 |
| `/src/components/admin/ContentManager.tsx` | 콘텐츠 관리 |
| `/src/components/admin/UserManager.tsx` | 사용자 관리 |
| `/src/components/admin/RoleManager.tsx` | 권한 관리 |
| `/src/components/admin/AuditLogViewer.tsx` | 감사 로그 |
| `/src/components/admin/SiteConfigEditor.tsx` | 사이트 설정 |

### 2.2 신규 API

| 엔드포인트 | 설명 |
|------------|------|
| `POST /api/admin/auth` | 로그인 |
| `DELETE /api/admin/auth` | 로그아웃 |
| `GET /api/admin/auth` | 세션 확인 |
| `GET/POST/PUT/DELETE /api/admin/content` | 콘텐츠 CRUD |
| `GET/PUT/DELETE /api/admin/content/[key]` | 키 기반 콘텐츠 |
| `GET/POST/PUT/DELETE /api/admin/users` | 사용자 관리 |
| `GET/PUT /api/admin/roles` | 권한 관리 |
| `GET /api/admin/audit` | 감사 로그 |
| `GET/PUT /api/admin/config` | 사이트 설정 |
| `GET /api/admin/stats` | 대시보드 통계 |
| `GET /api/cms/content` | 공개 CMS API |

---

## 3. 데이터베이스 변경 이력

| 버전 | 모델 수 | 추가 | 수정 | 삭제 |
|------|---------|------|------|------|
| v1.0 | 5 | AiSettings, ChatSession, ChatMessage, QuizResult, ImageHistory | - | - |
| v2.0 | 9 | AdminUser, Content, SiteConfig, AuditLog, Permission | - | - |
| v2.1 | 13 | Notification, UserActivity, ContentVersion, OnboardingProgress | Permission (+3필드) | - |

---

## 4. 의존성 변경

### 4.1 v2.1.0 추가 패키지/기능

| 기능 | 파일/경로 | 설명 |
|------|-----------|------|
| PWA 서비스 워커 | `public/sw.js` | 4계층 캐시, 오프라인, 백그라운드 동기, 푸시 |
| PWA 매니페스트 | `public/manifest.json` | shortcuts, screenshots, share_target, protocol_handlers |
| PWA 훅 | `hooks/use-pwa.ts` | 설치, SW, 푸시, 캐시, 온/오프라인 상태 |
| Hydration 안전 훅 | `hooks/use-hydrated.ts` | useClientValue, useHydrated (useSyncExternalStore) |
| PWA 컴포넌트 | `components/features/PWA*` | InstallBanner, OfflineIndicator, NotificationManager, SettingsPanel |
| TWA 설정 | `twa/`, `public/.well-known/` | Digital Asset Links, Bubblewrap config, BUILD_GUIDE |
| PWA API | `api/pwa/subscribe`, `api/pwa/notify` | 푸시 구독, 알림 발송 |
| Hydration 적용 | use-pwa.ts, use-voice.ts, use-admin-auth.ts, page.tsx | SSR/CSR hydration mismatch 방지 |
| Mock 모드 훅 | `hooks/use-mock-mode.ts` | Mock 모드 상태 관리 |
| Toast 훅 | `hooks/use-toast.ts` | Toast 알림 추상화 |
| 시니어 가이드 투어 | `components/features/SeniorGuideTour` | 온보딩 스텝 투어 |
| PWA Zustand 스토어 | `stores/use-pwa-store.ts` | PWA 상태 관리 |
| reactStrictMode | `next.config.ts` | PWA/SW 호환성을 위해 false 설정 |

### 4.2 v2.0 추가 패키지

| 패키지 | 버전 | 용도 |
|--------|------|------|
| bcryptjs | latest | 비밀번호 해싱 |
| recharts | latest | 대시보드 차트 |
| framer-motion | latest | 애니메이션 |
| sonner | latest | Toast 알림 |
| zod | latest | 입력 검증 (간접) |

---

## 5. 설정 변경

| 항목 | v1.0 | v2.0 | v2.1 |
|------|------|------|------|
| Prisma 모델 | 5개 | 9개 | 13개 |
| API 엔드포인트 | 5개 | 16개 | 26개 |
| 권한 수 | 0개 | 6개 | 9개 |
| 역할 수 | 0개 | 4개 | 4개 |
| 폰트 수준 | 1개 | 1개 | 4개 |
| 레이아웃 모드 | 1개 | 6개 | 6개 |
| UI 컴포넌트 | 6개 | 18개 | 28개 |
