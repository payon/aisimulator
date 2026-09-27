# Program (프로그램 구현 문서)

## AI 플랫폼 관리자 대시보드 구현 상세

| 항목 | 내용 |
|------|------|
| 버전 | 2.1.0 |
| 작성일 | 2025-08-12 |

---

## 1. AdminPanel — `src/components/admin/AdminPanel.tsx`

### 1.1 역할
관리자 대시보드의 메인 컨테이너 컴포넌트. 인증 상태에 따라 로그인 폼 또는 대시보드를 렌더링.

### 1.2 구조
```typescript
export default function AdminPanel() {
  // 인증 상태 확인 (admin-store) — hydration-safe
  // 키오스크 감지 (window.innerWidth)
  // 6개 탭: 대시보드/콘텐츠 관리/사용자 관리/권한 관리/감사 로그/사이트 설정
  // 사용자 아바타 드롭다운 (로그아웃)
  // 반응형 탭 바 (모바일: 스크롤, 데스크톱: 고정)
}
```

### 1.3 키오스크 감지
```typescript
const [kioskMode, setKioskMode] = useState<'auto'|'kiosk-21'|'kiosk-32'>('auto')
useEffect(() => {
  const detect = () => {
    const w = window.innerWidth
    if (w >= 1920) setKioskMode('kiosk-32')
    else if (w >= 1080) setKioskMode('kiosk-21')
    else setKioskMode('auto')
  }
  detect()
  window.addEventListener('resize', detect)
  return () => window.removeEventListener('resize', detect)
}, [])
```

### 1.4 조건부 렌더링
- `isAuthenticated === false` → `<AdminLogin />`
- `isAuthenticated === true` → 탭 인터페이스 + 사용자 드롭다운

---

## 2. AdminLogin — `src/components/admin/AdminLogin.tsx`

### 2.1 역할
관리자 로그인 폼. 중앙 카드 레이아웃.

### 2.2 상태
```typescript
email: string           // 이메일 입력
password: string        // 비밀번호 입력
isLoading: boolean      // 로그인 요청 중
error: string | null    // 에러 메시지
```

### 2.3 핵심 로직
```
handleLogin():
  1. 이메일/비밀번호 검증 (빈 값 체크)
  2. POST /api/admin/auth { email, password }
  3. 성공: admin-store.login(token, user)
  4. 실패: 에러 메시지 표시
  5. 토스트 알림
```

### 2.4 UI 구성
- Card 컴포넌트 (중앙 정렬)
- Shield 아이콘 + "관리자 로그인" 제목
- 이메일 Input (type="email")
- 비밀번호 Input (type="password")
- 로그인 Button (로딩 스피너)
- 에러 메시지 (조건부 표시)

---

## 3. AdminDashboard — `src/components/admin/AdminDashboard.tsx`

### 3.1 역할
대시보드 통계 카드 + 활동 차트 + 최근 감사 로그.

### 3.2 상태
```typescript
stats: StatsData | null    // 서버 통계 데이터
auditLogs: AuditLog[]      // 최근 5건 감사 로그
isLoading: boolean         // 로딩 상태
```

### 3.3 핵심 로직
```
useEffect():
  1. GET /api/admin/stats → 통계 데이터
  2. GET /api/admin/audit?limit=5 → 최근 로그
```

### 3.4 UI 구성
- 4개 통계 카드 (콘텐츠, 사용자, 채팅 세션, 퀴즈 결과) — Framer Motion stagger
- 활동 막대 그래프 (Recharts BarChart)
- 최근 감사 로그 테이블 (5건)
- Skeleton 로딩 상태

---

## 4. ContentManager — `src/components/admin/ContentManager.tsx`

### 4.1 역할
CMS 콘텐츠 전체 CRUD 관리.

### 4.2 상태
```typescript
contents: Content[]           // 콘텐츠 목록
selectedCategory: string     // 카테고리 필터
searchQuery: string          // 검색 쿼리
editingContent: Content | null  // 편집 중인 항목
isCreating: boolean          // 새 콘텐츠 생성 모드
isLoading: boolean
```

### 4.3 카테고리 탭
```
전체 | home | chat | image | future | quiz | settings | global | nav
```

### 4.4 핵심 로직
```
loadContents():
  1. GET /api/admin/content?category={selectedCategory}
  2. 검색 쿼리로 클라이언트 필터 (key/label)

handleSave():
  1. 편집 모드: PUT /api/admin/content { id, value, label, ... }
  2. 생성 모드: POST /api/admin/content { key, category, type, value, ... }
  3. 감사 로그 자동 기록 (서버)

handleDelete():
  1. 확인 다이얼로그 표시
  2. DELETE /api/admin/content { id }
  3. 권한: canDeleteContent 필요
```

### 4.5 타입별 편집 UI
| 타입 | 편집 컴포넌트 |
|------|-------------|
| text | `<Input>` |
| rich_text | `<Textarea>` (5줄) |
| image | `<Input>` + 이미지 미리보기 |
| json | `<Textarea>` + JSON 유효성 검사 |
| color | `<Input>` (color type) + 색상 미리보기 |
| url | `<Input type="url">` |

---

## 5. UserManager — `src/components/admin/UserManager.tsx`

### 5.1 역할
관리자 사용자 CRUD 관리.

### 5.2 상태
```typescript
users: AdminUser[]           // 사용자 목록
editingUser: AdminUser | null  // 편집 중인 사용자
isCreating: boolean          // 생성 모드
isLoading: boolean
```

### 5.3 핵심 로직
```
handleSave():
  1. 생성: POST /api/admin/users { email, name, password, role }
  2. 수정: PUT /api/admin/users { id, name, role, isActive, password? }

handleToggleActive():
  1. PUT /api/admin/users { id, isActive: !current }
  2. Switch 컴포넌트로 즉시 토글

handleDelete():
  1. 확인 다이얼로그
  2. DELETE /api/admin/users { id }
  3. 마지막 superadmin 보호 (서버 검증)
  4. 자기 자신 삭제 방지 (서버 검증)
```

### 5.4 역할 뱃지
| 역할 | 뱃지 색상 |
|------|----------|
| superadmin | 배경: red-100, 텍스트: red-700 |
| admin | 배경: amber-100, 텍스트: amber-700 |
| editor | 배경: blue-100, 텍스트: blue-700 |
| viewer | 배경: gray-100, 텍스트: gray-700 |

---

## 6. RoleManager — `src/components/admin/RoleManager.tsx`

### 6.1 역할
4개 역할의 권한 매트릭스 관리.

### 6.2 상태
```typescript
permissions: Permission[]    // 권한 목록
editingRole: string | null   // 편집 중인 역할
isLoading: boolean
```

### 6.3 핵심 로직
```
loadPermissions():
  1. GET /api/admin/roles

handleSavePermissions(role):
  1. PUT /api/admin/roles { role, canManageUsers, ... }
  2. superadmin만 수정 가능
```

### 6.4 권한 매트릭스 UI
```
┌────────────┬──────┬──────┬──────┬──────┐
│   권한     │super │admin │editor│viewer│
├────────────┼──────┼──────┼──────┼──────┤
│ 사용자관리 │  ☑   │  ☑   │  ☐   │  ☐   │
│ 콘텐츠관리 │  ☑   │  ☑   │  ☑   │  ☐   │
│ 설정관리   │  ☑   │  ☑   │  ☐   │  ☐   │
│ 감사로그   │  ☑   │  ☑   │  ☐   │  ☐   │
│ 콘텐츠삭제 │  ☑   │  ☑   │  ☐   │  ☐   │
│ API키관리  │  ☑   │  ☐   │  ☐   │  ☐   │
│ 알림관리   │  ☑   │  ☑   │  ☐   │  ☐   │
│ 데이터내보내기│  ☑   │  ☑   │  ☐   │  ☐   │
│ 분석열람   │  ☑   │  ☑   │  ☐   │  ☐   │
└────────────┴──────┴──────┴──────┴──────┘
```

---

## 7. AuditLogViewer — `src/components/admin/AuditLogViewer.tsx`

### 7.1 역할
감사 로그 페이지네이션 조회 + 필터링.

### 7.2 상태
```typescript
logs: AuditLog[]             // 로그 목록
pagination: { page, limit, total, totalPages }
filters: { action, entity, userId }  // 필터
isLoading: boolean
```

### 7.3 핵심 로직
```
loadLogs():
  1. GET /api/admin/audit?page={page}&limit={limit}&action={action}&entity={entity}
  2. 페이지네이션 정보 갱신

handlePageChange(page):
  1. page 상태 갱신
  2. loadLogs() 재호출
```

### 7.4 UI 구성
- 필터 Select (액션, 엔티티)
- Table (시간, 사용자, 액션, 엔티티, 변경 내용)
- 확장 행 (changes JSON 펼침/접힘)
- Pagination 컴포넌트

---

## 8. SiteConfigEditor — `src/components/admin/SiteConfigEditor.tsx`

### 8.1 역할
사이트 전역 설정 편집.

### 8.2 상태
```typescript
config: SiteConfig | null    // 설정 데이터
isLoading: boolean
```

### 8.3 편집 가능한 필드
| 필드 | 입력 타입 | 설명 |
|------|----------|------|
| siteName | Input | 사이트 이름 |
| siteDescription | Textarea | 사이트 설명 |
| logoUrl | Input | 로고 이미지 URL |
| primaryColor | Color Picker | 기본 색상 |
| layoutMode | Select | 레이아웃 모드 (auto/kiosk-21/kiosk-32/desktop/tablet/mobile) |
| language | Select | 언어 |
| maintenanceMode | Switch + AlertDialog | 유지보수 모드 |
| mockMode | Switch | Mock 모드 (개발/데모용) |

### 8.4 핵심 로직
```
loadConfig():
  1. GET /api/admin/config

handleSave():
  1. PUT /api/admin/config { siteName, siteDescription, mockMode, ... }

handleMaintenanceToggle():
  1. AlertDialog 확인 표시
  2. 확인 시 maintenanceMode 토글
  3. PUT /api/admin/config
```

### 8.5 레이아웃 모드 옵션
| 값 | 라벨 |
|----|------|
| auto | 자동 감지 |
| kiosk-21 | 키오스크 21인치 |
| kiosk-32 | 키오스크 32인치 |
| desktop | 데스크톱 |
| tablet | 태블릿 |
| mobile | 모바일 |

---

## 9. admin-store — `src/stores/admin-store.ts`

### 9.1 인터페이스
```typescript
interface AdminStore {
  isAuthenticated: boolean
  token: string | null
  user: { id, email, name, role } | null
  login: (token: string, user: AdminUser) => void
  logout: () => void
  checkAuth: () => void
}
```

### 9.2 영속화
- `login()`: localStorage에 admin_token, admin_user 저장
- `logout()`: localStorage에서 제거 + 상태 초기화
- `checkAuth()`: localStorage에서 복원 (페이지 새로고침 시)

---

## 10. useCmsContent — `src/hooks/use-cms-content.ts`

### 10.1 인터페이스
```typescript
function useCmsContent(): {
  content: CmsContentMap          // 전체 콘텐츠 맵
  getContent: (key: string, fallback?: string) => string  // 키로 조회
  loading: boolean               // 로딩 상태
  refreshContent: () => Promise<void>  // 강제 갱신
}

function useCmsValue(key: string, fallback?: string): {
  value: string
  loading: boolean
  refreshContent: () => Promise<void>
}
```

### 10.2 캐시 전략
- 전역 변수 `contentCache` + `cacheTimestamp`
- 30초 TTL
- 모든 컴포넌트가 동일 캐시 공유
- `refreshContent()`로 강제 무효화

---

## 11. use-admin-auth — `src/hooks/use-admin-auth.ts`

### 11.1 인터페이스
```typescript
function useAdminAuth(): {
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
  isLoading: boolean
}
```

### 11.2 핵심 로직
- `login()`: POST /api/admin/auth → admin-store.login()
- `logout()`: DELETE /api/admin/auth → admin-store.logout()
- `authenticatedFetch()`: Authorization 헤더 자동 첨부
- 마운트 시 `checkAuth()` 자동 호출 (hydration-safe 패턴 적용)

---

## 12. admin-auth — `src/lib/admin-auth.ts`

### 12.1 함수 목록
```typescript
createSession(userId, email, role): string        // 세션 생성 → UUID 토큰
getSession(token): Session | null                  // 세션 조회 + 만료 확인
deleteSession(token): boolean                      // 세션 삭제
authenticateRequest(request): Session | null       // Authorization 헤더 파싱
hasPermission(role, permissionKey): Promise<boolean> // 권한 확인
getPermissionsForRole(role): Promise<Permissions>  // 역할 권한 조회
verifyPassword(password, hash): Promise<boolean>   // 비밀번호 검증
hashPassword(password): Promise<string>            // 비밀번호 해싱
getActiveSessionCount(): number                    // 활성 세션 수
```

---

## 13. audit — `src/lib/audit.ts`

### 13.1 함수
```typescript
logAction(userId, userEmail, action, entity, entityId?, changes?, ip?): Promise<void>
```

### 13.2 특성
- changes: object → JSON.stringify, string → 그대로 저장
- DB 오류 시 콘솔 에러만 출력 (주 작업 방해하지 않음)
- 모든 create/update/delete/login/logout 작업에 호출

---

## 14. PWA 컴포넌트 — `src/components/pwa/`

### 14.1 PWAInstallBanner — `src/components/pwa/PWAInstallBanner.tsx`

**역할**: PWA 설치 프롬프트 배너. `beforeinstallprompt` 이벤트 감지 후 설치 버튼 표시.

```typescript
export default function PWAInstallBanner() {
  // usePWA() 훅으로 설치 상태 감지
  // useHydrated()로 hydration 안전 렌더링
  // 설치 전: 배너 표시 (설치 버튼 + 닫기 버튼)
  // 설치 후: 배너 숨김
  // 이미 설치됨: 렌더링하지 않음
}
```

**핵심 로직**:
- `usePWA().installPrompt` 존재 시 설치 가능 상태
- `handleInstall()`: 설치 프롬프트 트리거 → 결과에 따라 토스트 알림
- `handleDismiss()`: 배너 닫기 (세션 스토리지에 기록, 동일 세션 내 재표시 방지)

### 14.2 OfflineIndicator — `src/components/pwa/OfflineIndicator.tsx`

**역할**: 네트워크 오프라인 상태 표시기.

```typescript
export default function OfflineIndicator() {
  // usePWA() 훅으로 online/offline 상태 감지
  // 오프라인: 상단 고정 배너 (주황색 경고)
  // 온라인: 렌더링하지 않음
}
```

**핵심 로직**:
- `usePWA().isOnline` 기반 조건부 렌더링
- 오프라인 배너에 "현재 오프라인입니다. 일부 기능이 제한될 수 있습니다." 메시지

### 14.3 PWANotificationManager — `src/components/pwa/PWANotificationManager.tsx`

**역할**: 푸시 알림 구독 관리 UI.

```typescript
export default function PWANotificationManager() {
  // usePWA() 훅으로 알림 권한 상태 감지
  // useHydrated()로 hydration 안전 렌더링
  // 권한 요청 버튼 / 상태 표시
}
```

**핵심 로직**:
- `usePWA().notificationPermission` 기반 (default/granted/denied)
- 권한 요청: `Notification.requestPermission()` → POST /api/pwa/subscribe
- 권한 상태 표시: 허용됨(초록), 거부됨(빨강), 미요청(회색)
- 알림 테스트: POST /api/pwa/notify로 테스트 알림 발송

### 14.4 PWASettingsPanel — `src/components/pwa/PWASettingsPanel.tsx`

**역할**: PWA 설정 패널 (캐시 관리, SW 상태, 알림 설정).

```typescript
export default function PWASettingsPanel() {
  // usePWAStore()로 PWA 상태 관리
  // 캐시 용량 표시 및 삭제
  // Service Worker 업데이트 확인
  // 알림 설정 토글
}
```

**핵심 로직**:
- 캐시 삭제: `caches.keys()` → `caches.delete()` 전체
- SW 업데이트: `navigator.serviceWorker.getRegistration()` → `registration.update()`
- 오프라인 페이지 미리보기

---

## 15. PWA 훅 — `src/hooks/`

### 15.1 use-pwa — `src/hooks/use-pwa.ts`

**인터페이스**:
```typescript
function usePWA(): {
  isInstallable: boolean         // 설치 프롬프트 가능 여부
  isInstalled: boolean           // 이미 설치됨 여부
  installPrompt: BeforeInstallPromptEvent | null
  handleInstall: () => Promise<boolean>  // 설치 트리거
  isOnline: boolean              // 온라인 상태
  isOffline: boolean             // 오프라인 상태
  notificationPermission: NotificationPermission  // 알림 권한
  requestNotificationPermission: () => Promise<NotificationPermission>
  subscribeToPush: (subscription: PushSubscription) => Promise<boolean>
  swRegistration: ServiceWorkerRegistration | null
  updateAvailable: boolean       // SW 업데이트 가능
  applyUpdate: () => void        // SW 업데이트 적용 (페이지 리로드)
}
```

**핵심 로직**:
- `beforeinstallprompt` 이벤트 리스너로 설치 프롬프트 캡처
- `online`/`offline` 이벤트로 네트워크 상태 감지
- `navigator.serviceWorker` 등록 및 업데이트 감지
- `Notification.requestPermission()`으로 알림 권한 요청
- POST /api/pwa/subscribe로 푸시 구독 등록
- hydration-safe: `useClientValue` / `useHydrated` 패턴 적용

### 15.2 use-hydrated — `src/hooks/use-hydrated.ts`

**인터페이스**:
```typescript
function useHydrated(): boolean

function useClientValue<T>(serverValue: T, getClientValue: () => T): T
```

**핵심 로직**:
- `useHydrated()`: `useSyncExternalStore`로 hydration 완료 여부 감지
  - 서버: `false`, 클라이언트: `true`
- `useClientValue<T>()`: SSR/CSR hydration mismatch 방지
  - 서버 렌더링: `serverValue` 반환
  - hydration 후: `getClientValue()` 반환
  - 내부적으로 `useSyncExternalStore` 사용

---

## 16. Hydration 안전 패턴 — `useClientValue` / `useHydrated`

### 16.1 문제 배경
Radix UI 등의 라이브러리에서 `aria-controls` 속성에 동적 ID를 생성할 때, 서버와 클라이언트의 ID가 불일치하여 hydration mismatch 에러가 발생합니다. 또한 `navigator.onLine`, `window.innerWidth` 등의 브라우저 API는 서버 사이드에 존재하지 않아 SSR에서 에러를 유발합니다.

### 16.2 해결 방법
`useSyncExternalStore`를 활용하여 서버/클라이언트 렌더링 값을 분리:

```typescript
// 서버에서는 serverValue, 클라이언트에서는 getClientValue()
const value = useClientValue(serverDefaultValue, () => getBrowserValue())

// hydration 완료 여부 확인
const isHydrated = useHydrated()
```

### 16.3 적용 대상
| 컴포넌트/훅 | 적용 이유 |
|------------|----------|
| use-pwa.ts | `navigator.onLine`, `navigator.serviceWorker` 접근 |
| use-voice.ts | `window.SpeechRecognition`, MediaDevices API |
| use-admin-auth.ts | `localStorage` 접근 (checkAuth) |
| page.tsx | 키오스크 감지, 탭 상태 초기화 |
| PWAInstallBanner | `beforeinstallprompt` 이벤트 상태 |
| PWANotificationManager | `Notification.permission` 상태 |

---

## 17. SeniorGuideTour — `src/components/features/SeniorGuideTour.tsx`

### 17.1 역할
시니어 사용자를 위한 단계별 가이드 투어. 주요 기능을 스텝별로 안내.

### 17.2 상태
```typescript
steps: GuideStep[]            // 가이드 스텝 목록
currentStep: number           // 현재 스텝 인덱스
isActive: boolean             // 투어 활성 상태
```

### 17.3 핵심 로직
- `useGuideTourStore()`로 투어 상태 관리 (Zustand)
- 스텝 이동: 이전/다음/건너뛰기/완료
- 포커스 트래핑: 현재 스텝의 대상 요소에 포커스
- 완료 시 `OnboardingProgress`에 기록

---

## 18. MockModeIndicator — `src/components/features/MockModeIndicator.tsx`

### 18.1 역할
Mock 모드 활성 상태를 시각적으로 표시하는 인디케이터.

### 18.2 핵심 로직
- `use-mock-mode` 훅으로 Mock 모드 감지
- 활성 시: 상단 배너에 "Mock 모드" 뱃지 표시 (주황색)
- 비활성 시: 렌더링하지 않음

---

## 19. MockDataManager — `src/components/admin/MockDataManager.tsx`

### 19.1 역할
관리자 대시보드에서 Mock 데이터를 생성/조회/초기화하는 관리 컴포넌트.

### 19.2 상태
```typescript
mockStatus: MockStatus | null  // Mock 데이터 현황
isLoading: boolean
```

### 19.3 핵심 로직
```
loadMockStatus():
  1. GET /api/admin/mock

handleGenerate():
  1. 모델 선택 + 개수 입력
  2. POST /api/admin/mock { models, count }

handleReset():
  1. AlertDialog 확인 표시
  2. POST /api/admin/mock/reset { confirm: true }
```

### 19.4 UI 구성
- Mock 모델 선택 체크박스 (chatSessions, quizResults, imageHistory, notifications, userActivities)
- 생성 개수 Input
- 생성 버튼 + 초기화 버튼 (AlertDialog)
- 현재 Mock 데이터 현황 테이블

---

## 20. PWA Zustand 스토어 — `src/stores/usePWAStore.ts`

### 20.1 인터페이스
```typescript
interface PWAStore {
  isInstallable: boolean
  isInstalled: boolean
  isOnline: boolean
  notificationPermission: NotificationPermission
  swRegistration: ServiceWorkerRegistration | null
  updateAvailable: boolean
  setInstallable: (v: boolean) => void
  setInstalled: (v: boolean) => void
  setOnline: (v: boolean) => void
  setNotificationPermission: (p: NotificationPermission) => void
  setSwRegistration: (r: ServiceWorkerRegistration | null) => void
  setUpdateAvailable: (v: boolean) => void
}
```

### 20.2 특성
- Zustand로 PWA 관련 전역 상태 관리
- `use-pwa` 훅과 함께 사용
- hydration-safe: 서버에서는 기본값 사용

---

## 21. Service Worker — `public/sw.js`

### 21.1 캐시 �어 (4개)
| 캐시 이름 | 전략 | 대상 | TTL |
|----------|------|------|-----|
| static-cache | Cache First | HTML, CSS, JS | 버전 변경 시 |
| dynamic-cache | Stale While Revalidate | API 응답 | 무제한 (백그라운드 갱신) |
| image-cache | Cache First | 이미지 파일 | 30일 |
| api-cache | Network First | /api/* 요청 | 오프라인 폴백 |

### 21.2 이벤트 핸들러
- `install`: 캐시 사전 설치 (정적 리소스)
- `activate`: 구 캐시 정리
- `fetch`: 캐시 �어별 라우팅
- `push`: 푸시 알림 수신 → `showNotification()`
- `notificationclick`: 알림 클릭 → URL 열기
- `sync`: 백그라운드 동기화 (오프라인 작업 처리)

### 21.3 오프라인 폴백
- 네비게이션 요청: 오프라인 페이지 (`/offline.html`) 반환
- API 요청: 캐시된 응답 또는 에러 응답 반환
