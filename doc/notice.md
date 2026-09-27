# Notice (릴리즈 노트)

## AI 플랫폼 관리자 대시보드 릴리즈 정보

| 항목 | 내용 |
|------|------|
| 제품명 | AI 플랫폼 (관리자 대시보드 포함) |
| 버전 | 2.1.0 |
| 릴리즈일 | 2025-08-12 |
| 상태 | 정식 릴리즈 |

---

## 1. 버전 2.1.0 — PWA·TWA·알림·하이드레이션 안정화

### 1.1 신규 기능 (New Features)

| 기능 | 설명 |
|------|------|
| PWA 지원 | Service Worker (4단계 캐시 티어), Web App Manifest (shortcuts, screenshots, share_target), 설치 프롬프트, 오프라인 페이지, 백그라운드 동기화, 푸시 알림 |
| TWA 구성 | Digital Asset Links (.well-known/assetlinks.json), Bubblewrap 빌드 설정 (twa/bubblewrap-config.json), 빌드 가이드 (twa/BUILD_GUIDE.md) |
| 하이드레이션 안전 | useClientValue / useHydrated 훅 (useSyncExternalStore 기반), Radix UI aria-controls ID 불일치 방지 |
| 푸시 알림 API | 공개 구독 (/api/pwa/subscribe), 관리자 발송 (/api/pwa/notify), 알림 권한 관리 컴포넌트 |
| 알림 시스템 | Notification DB 모델, /api/notifications (공개), /api/admin/notifications (관리), 타입/우선순위/대상역할 지정 |
| 활동 추적 API | UserActivity DB 모델, /api/admin/activity 엔드포인트 |
| 권한 확장 | 6→9 필드 (canManageNotifications, canExportData, canViewAnalytics 추가) |
| 모의 데이터 관리 | /api/admin/mock 엔드포인트, 개발/테스트용 모의 데이터 시드/초기화 |
| PWA 메타 태그 | layout.tsx에 theme-color, apple-touch-icon, manifest 링크 추가 |
| PWA 상태 관리 | Zustand PWA 스토어 (설치 상태, 오프라인, 업데이트, 알림 권한) |

### 1.2 PWA 구성 상세

| 항목 | 설명 |
|------|------|
| Service Worker | 4단계 캐시 티어 (static, dynamic, api, offline), stale-while-revalidate 전략 |
| Web App Manifest | name, short_name, icons, shortcuts (대화/이미지/퀴즈), screenshots, share_target |
| PWA 훅 | use-pwa.ts (설치 프롬프트, 오프라인, 업데이트 감지), use-hydrated.ts (useClientValue, useHydrated) |
| PWA 컴포넌트 | PWAInstallBanner, OfflineIndicator, PWANotificationManager, PWASettingsPanel |
| PWA API 라우트 | /api/pwa/subscribe (구독 등록), /api/pwa/notify (푸시 발송) |
| 오프라인 페이지 | 커스텀 오프라인 폴백 페이지, 자동 재연결 감지 |

### 1.3 이전 기능 (v2.0.0 유지)

| 기능 | 설명 |
|------|------|
| 관리자 인증 | 이메일/비밀번호 로그인, Bearer 토큰 세션, 24h TTL |
| CMS 콘텐츠 관리 | 프론트엔드 모든 텍스트·이미지 실시간 편집, 6가지 콘텐츠 타입 |
| 사용자 관리 | 관리자 CRUD, 역할 뱃지, 활성/비활성 토글 |
| 권한 관리 | 4역할 × 9권한 RBAC 매트릭스, superadmin 보호 |
| 감사 로그 | 모든 변경 작업 추적, 페이지네이션, 필터링 |
| 사이트 설정 | 사이트 이름/설명/로고/레이아웃/유지보수 모드 |
| 키오스크 지원 | 21인치/32인치 키오스크, 자동 감지, 확대 폰트/터치 |
| 대시보드 통계 | 콘텐츠/사용자/채팅/퀴즈/이미지 수, 활동 차트 |
| 공개 CMS API | /api/cms/content (인증 불필요, 키-값 맵) |

### 1.4 기존 기능 (v1.0.0 유지)

| 기능 | 설명 |
|------|------|
| AI 대화하기 | AI와 실시간 채팅, 음성 합성(TTS) 지원 |
| 이미지 변환 | 6가지 스타일 변환 |
| 미래의 나 | 나이 진행 이미지 생성, 건강 관리 팁 |
| AI 퀴즈 | 3단계 난이도, 동적 문제 생성 |
| 설정 | 다중 AI 제공자 선택, API 키 관리 |

### 1.5 지원 AI 제공자

| 제공자 | 모델 | 채팅 | 이미지 | 비고 |
|--------|------|------|--------|------|
| 내장 AI | 기본 | ✅ | ✅ | API 키 불필요 |
| OpenAI | gpt-4o-mini | ✅ | ✅ | sk-... 키 필요 |
| Google Gemini | gemini-2.0-flash | ✅ | ❌ | AIza... 키 필요 |
| xAI Grok | grok-3-mini | ✅ | ❌ | xai-... 키 필요 |
| Anthropic Claude | claude-sonnet-4 | ✅ | ❌ | sk-ant-... 키 필요 |

---

## 2. 데이터베이스 변경

### 2.1 신규 모델

| 모델 | 설명 | 레코드 수 |
|------|------|----------|
| AdminUser | 관리자 계정 | 1 (기본) |
| Content | CMS 콘텐츠 | 0 (온디맨드) |
| SiteConfig | 사이트 설정 | 1 (Singleton) |
| AuditLog | 감사 로그 | 0 (자동 생성) |
| Permission | 권한 정의 | 4 (기본) |
| Notification | 알림 메시지 | 0 (온디맨드) |
| UserActivity | 사용자 활동 로그 | 0 (자동 생성) |
| ContentVersion | 콘텐츠 버전 이력 | 0 (자동 생성) |
| OnboardingProgress | 온보딩 진행 상태 | 0 (온디맨드) |

### 2.2 기존 모델 (변경 없음)

AiSettings, ChatSession, ChatMessage, QuizResult, ImageHistory

---

## 3. API 변경

### 3.1 신규 엔드포인트

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | /api/admin/auth | 로그인 |
| DELETE | /api/admin/auth | 로그아웃 |
| GET | /api/admin/auth | 세션 확인 |
| GET | /api/admin/content | 콘텐츠 목록 |
| POST | /api/admin/content | 콘텐츠 생성 |
| PUT | /api/admin/content | 콘텐츠 수정 |
| DELETE | /api/admin/content | 콘텐츠 삭제 |
| GET | /api/admin/content/[key] | 단일 콘텐츠 조회 |
| PUT | /api/admin/content/[key] | 단일 콘텐츠 수정 |
| DELETE | /api/admin/content/[key] | 단일 콘텐츠 삭제 |
| GET | /api/admin/users | 사용자 목록 |
| POST | /api/admin/users | 사용자 생성 |
| PUT | /api/admin/users | 사용자 수정 |
| DELETE | /api/admin/users | 사용자 삭제 |
| GET | /api/admin/roles | 권한 목록 |
| PUT | /api/admin/roles | 권한 수정 |
| GET | /api/admin/audit | 감사 로그 |
| GET | /api/admin/config | 사이트 설정 조회 |
| PUT | /api/admin/config | 사이트 설정 수정 |
| GET | /api/admin/stats | 대시보드 통계 |
| GET | /api/cms/content | 공개 CMS 콘텐츠 |
| POST | /api/pwa/subscribe | 푸시 알림 구독 등록 |
| POST | /api/pwa/notify | 푸시 알림 발송 (관리자) |
| GET | /api/notifications | 알림 목록 (공개) |
| GET | /api/admin/notifications | 알림 목록 (관리자) |
| POST | /api/admin/notifications | 알림 생성 (관리자) |
| PUT | /api/admin/notifications | 알림 수정 (관리자) |
| DELETE | /api/admin/notifications | 알림 삭제 (관리자) |
| GET | /api/admin/permissions | 권한 상세 조회 |
| PUT | /api/admin/permissions | 권한 수정 |
| GET | /api/admin/activity | 사용자 활동 로그 |
| GET | /api/admin/mock | 모의 데이터 조회 |
| POST | /api/admin/mock | 모의 데이터 시드 |
| DELETE | /api/admin/mock | 모의 데이터 초기화 |

### 3.2 Breaking Changes

| 변경 | 설명 | 마이그레이션 |
|------|------|------------|
| Prisma 스키마 확장 | 9개 신규 모델 추가 (총 13개) | `bun run db:push` |
| Permission 모델 확장 | 3개 필드 추가 (6→9) | 기존 레코드 기본값 false |
| 탭 구조 변경 | 하단 탭 바 6개 (admin은 사이드바로 이동) | 자동 반영 |

---

## 4. 시스템 요구사항

| 항목 | 최소 | 권장 |
|------|------|------|
| 런타임 | Bun 최신 | Bun 최신 |
| 메모리 | 512MB | 1GB+ |
| 디스크 | 100MB | 500MB+ |
| 네트워크 | 인터넷 연결 (AI API) | 빠른 연결 |
| 브라우저 | PWA: Chrome 80+, Edge 80+ | Chrome 최신 |

---

## 5. 설치 및 실행

### 5.1 환경 변수 설정
```bash
# .env 파일
DATABASE_URL=file:./db/custom.db
OPENAI_API_KEY=          # 선택
GEMINI_API_KEY=          # 선택
GROK_API_KEY=            # 선택
CLAUDE_API_KEY=          # 선택
DEFAULT_AI_PROVIDER=zai-built-in
VAPID_PUBLIC_KEY=        # PWA 푸시 알림 (선택)
VAPID_PRIVATE_KEY=       # PWA 푸시 알림 (선택)
```

### 5.2 실행
```bash
# 데이터베이스 동기화 (스키마 변경 후)
bun run db:push

# 개발 모드
bun run dev

# 프로덕션 빌드
bun run build
bun run start
```

### 5.3 기본 관리자 계정
```
이메일: admin@aiplatform.kr
비밀번호: admin123
역할: superadmin
```

> ⚠️ 초기 로그인 후 비밀번호 변경을 권장합니다.

---

## 6. 알려진 제한사항

| 제한 | 설명 |
|------|------|
| 단일 라우트 | 환경 제약으로 / 라우트만 노출 |
| 인메모리 세션 | 서버 재시작 시 모든 세션 초기화 (재로그인 필요) |
| SQLite | 동시 쓰기 제한, 대규모 환경에서는 PostgreSQL 필요 |
| JWT 미지원 | 세션 토큰(UUID) 방식만 지원 |
| 콘텐츠 버전 관리 | ContentVersion 모델 추가되었으나 롤백 UI 미제공 |
| 파일 업로드 | 이미지 업로드 API 미제공 (URL만 지원) |
| 다국어 | 단일 언어(ko)만 지원 |
| 2FA | 2단계 인증 미지원 |
| Rate Limiting (관리자 API) | 별도 제한 미적용 (인증으로 보호) |
| TWA 서명 키 | assetlinks.json의 서명 키는 플레이스홀더, 프로덕션 빌드 시 실제 키 필요 |
| SW skipWaiting | Service Worker 업데이트 시 skipWaiting 사용, 다중 탭 환경에서 일시적 불일치 가능 |

---

## 7. Deprecation Notices

| 항목 | 설명 | 대체 |
|------|------|------|
| 평문 API 키 저장 | v2.2에서 암호화 저장 권장 | AES-256-GCM |
| localStorage 세션 토큰 | v2.3에서 HttpOnly 쿠키 권장 | 쿠키 기반 세션 |

---

## 8. 향후 로드맵

| 버전 | 내용 | 예상 일정 |
|------|------|----------|
| v2.2 | API 키 암호화, 로그인 실패 제한, CSP 헤더, 콘텐츠 버전 롤백 UI | Q3 2025 |
| v2.3 | Redis 세션, HttpOnly 쿠키, 세션 슬라이딩 윈도우, 파일 업로드 API | Q4 2025 |
| v2.4 | TWA 프로덕션 서명, 다국어(i18n), 오프라인 동기화 고도화 | Q1 2026 |
| v3.0 | PostgreSQL 마이그레이션, SSO (OAuth2), 2FA | Q2 2026 |

---

## 9. 변경 이력

| 버전 | 일자 | 변경 내용 |
|------|------|----------|
| 2.1.0 | 2025-08-12 | PWA/TWA 지원, 푸시 알림, 하이드레이션 안정화, 알림·활동·권한 확장, 모의 데이터 관리, DB 13 모델 |
| 2.0.0 | 2025-08-11 | 관리자 대시보드 추가 (인증, CMS, RBAC, 감사 로그, 키오스크) |
| 1.0.0 | 2025-08-11 | 초기 릴리즈 (AI 채팅, 이미지, 미래, 퀴즈, 설정) |

---

## 10. 크레딧

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| UI | shadcn/ui + Tailwind CSS 4 |
| 애니메이션 | Framer Motion |
| 차트 | Recharts |
| AI | z-ai-web-dev-sdk + OpenAI/Gemini/Grok/Claude |
| 데이터베이스 | Prisma + SQLite |
| 상태 관리 | Zustand |
| 인증 | bcrypt + 인메모리 세션 |
| PWA | Service Worker + Web App Manifest + Workbox |
| TWA | Bubblewrap + Digital Asset Links |
