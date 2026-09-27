# Notices and Changelog (공지 및 변경 이력)

> 본 문서는 시니어 사용자 디지털 복지 서비스 플랫폼의 버전 이력, 파괴적 변경,
> 사용 중단 공지, 알려진 문제, 타사 라이선스, 개인정보 처리, 접근성 준수 공지를 포함합니다.

---

## 1. Version History (버전 이력)

### v2.1.0 (2025-08-12) — PWA, TWA, Hydration 안전성

**새로운 기능:**
- **PWA (Progressive Web App)**: 서비스 워커(4계층 캐시), 웹 앱 매니페스트, 오프라인 지원, 설치 유도
- **TWA (Trusted Web Activity)**: Android 앱 래퍼, Digital Asset Links, Bubblewrap 빌드
- **Hydration 안전성 수정**: useClientValue/useHydrated 훅, Radix UI ID mismatch 방지
- **PWA 푸시 알림**: 백그라운드 동기, 푸시 알림 수신/처리, VAPID 키
- **신규 PWA 컴포넌트**: PWAInstallBanner, OfflineIndicator, PWANotificationManager, PWASettingsPanel
- **신규 훅**: use-hydrated.ts, use-pwa.ts, use-mock-mode.ts, use-toast.ts
- **신규 API**: /api/pwa/subscribe, /api/pwa/notify, /api/notifications, /api/config, /api/admin/permissions, /api/admin/activity, /api/admin/notifications, /api/admin/mock
- **DB 확장**: Notification, UserActivity, ContentVersion, OnboardingProgress 모델 추가 (13개 모델)
- **권한 확장**: canManageNotifications, canExportData, canViewAnalytics (9개 권한 필드)
- **탭 구조 변경**: 6탭 (home/chat/image/future/quiz/settings), 관리자는 사이드바
- **reactStrictMode: false**: PWA/SW 호환성 확보
- **신규 스토어**: usePWAStore, useGuideTourStore, useAccessibilityPanelStore

**기술 변경:**
- `public/sw.js` — 서비스 워커 (static/dynamic/images/API 캐시)
- `public/manifest.json` — PWA 매니페스트 (shortcuts, screenshots, share_target)
- `public/.well-known/assetlinks.json` — TWA Digital Asset Links
- `twa/bubblewrap-config.json` — TWA 빌드 설정
- `next.config.ts` — reactStrictMode: false
- `layout.tsx` — PWA 메타 태그 추가

---

### v2.0.0 (2025-03-15) — Admin Dashboard

**새로운 기능:**
- 관리자 대시보드 (RBAC, 감사 로그, 콘텐츠 관리)
- 실시간 동기화 (WebSocket)
- 접근성 강화 (고대비, 음성 안내, 온보딩)

---

### v1.0.0 (2025-01-28) — 초기 릴리즈

**새로운 기능:**
- 시니어 사용자 대시보드 (대형 폰트, 고대비 모드)
- AI 기반 복지 정보 챗봇
- 복지/건강/법률/교육 콘텐츠 관리
- 음성 안내 (TTS) 및 음성 입력 (STT)
- 관리자 콘솔 (RBAC, 감사 로그)
- 키오스크 모드 지원
- 실시간 콘텐츠 동기화 (WebSocket)
- 온보딩 가이드 (시니어 맞춤)
- 알림 시스템
- 빠른 실행 바 (Quick Action Bar)

**기술 스택:**
- Next.js 16 (App Router)
- TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- Prisma ORM (SQLite)
- Zustand (상태 관리)
- TanStack Query (서버 상태)
- Socket.io (실시간 통신)
- bcrypt (비밀번호 해싱)
- Zod (입력 검증)

---

### v0.9.0 (2025-01-20) — 베타

- 챗봇 기본 기능 구현
- 콘텐츠 CRUD API
- 기본 인증 (세션 기반)
- 시니어 UI 프로토타입

---

### v0.5.0 (2025-01-10) — 알파

- 프로젝트 초기 설정
- Next.js App Router 구조
- Prisma 스키마 설계
- 기본 레이아웃

---

## 2. Breaking Changes (파괴적 변경)

### v1.0.0

| 변경 사항 | 이전 | 이후 | 영향 | 대응 |
|-----------|------|------|------|------|
| 세션 토큰 형식 변경 | 단순 UUID | HMAC-SHA256 서명 | 기존 세션 무효화 | 재로그인 필요 |
| API 응답 구조 변경 | `{ data }` | `{ success, data, error, meta }` | 프론트엔드 파서 수정 필요 | ApiResponse 래퍼 사용 |
| 콘텐츠 버전 필드 추가 | 해당 없음 | `version: number` | 기존 콘텐츠 version=1 자동 설정 | 마이그레이션 스크립트 적용 |
| 권한 체계 변경 | 2개 역할 | 4개 역할, 9개 권한 | 기존 사용자 역할 재매핑 | 마이그레이션 시 기본값 적용 |
| PWA 캐시 전략 추가 | 해당 없음 | 서비스 워커 4계층 캐시 | 기존 캐시 없음 | SW 등록 시 자동 적용 |
| Hydration 안전성 훅 추가 | 해당 없음 | useClientValue, useHydrated | 기존 컴포넌트 | useClientValue 적용 필요 |
| reactStrictMode 변경 | true | false | SW 이중 등록 방지 | 호환성 향상 |

---

## 3. Deprecation Notices (사용 중단 공지)

| 항목 | 중단 버전 | 제거 예정 | 대체 | 비고 |
|------|-----------|-----------|------|------|
| `GET /api/contents` | v1.0.0 | v2.0.0 | `GET /api/cms/contents` | 경로 변경 |
| `localStorage` 직접 접근 | v1.0.0 | v2.0.0 | Zustand persist | 상태 관리 통일 |
| `fetch` 직접 호출 | v1.0.0 | v2.0.0 | TanStack Query | 캐시/재시도 자동화 |
| `window.speechSynthesis` 직접 사용 | v1.0.0 | v1.1.0 | `useSpeechSynthesis` hook | 훅으로 추상화 |
| 인라인 스타일 객체 | v1.0.0 | v1.1.0 | Tailwind 클래스 | 스타일 일관성 |

---

## 4. Known Issues (알려진 문제)

### v1.0.0

| ID | 심각도 | 설명 | 임시 해결 | 수정 예정 |
|----|--------|------|-----------|-----------|
| KI-001 | 🟡 Medium | Safari에서 Web Speech API가 간헐적으로 인식 실패 | 페이지 새로고침 | v1.0.1 |
| KI-002 | 🟡 Medium | 키오스크 4K 해상도에서 일부 아이콘 흐림함 | SVG 아이콘 사용 | v1.1.0 |
| KI-003 | 🟢 Low | 대량 콘텐츠(500+) 시 검색 응답 지연 (>2초) | 페이지네이션 limit 낮춤 | v1.1.0 |
| KI-004 | 🟢 Low | 다크모드에서 일부 이미지 대비 부족 | 고대비 모드 활성화 | v1.0.1 |
| KI-005 | 🟡 Medium | 모바일에서 음성 입력 시 키보드 자동 숨김 안 됨 | 수동 키보드 닫기 | v1.0.1 |
| KI-006 | 🟢 Low | Firefox에서 TTS 한국어 음성 없을 수 있음 | Chrome 브라우저 권장 | v1.1.0 |
| KI-007 | 🟡 Medium | 세션 만료 시 로그인 페이지로 리다이렉트 지연 | 수동 새로고침 | v1.0.1 |
| KI-008 | 🟡 Medium | Service Worker 업데이트 시 간헐적 캐시 불일치 | SW 갱신 알림 후 새로고침 | v2.1.1 |
| KI-009 | 🟢 Low | TWA에서 일부 Chrome 확장 프로그램 미작동 | TWA 환경에서는 확장 미지원 | - |
| KI-010 | 🟢 Low | Firefox에서 PWA 설치 미지원 | Chrome/Edge 권장 | v2.1.1 |

---

## 5. Third-Party Licenses (타사 라이선스)

### 5.1 직접 의존성

| 패키지 | 버전 | 라이선스 | 용도 |
|--------|------|----------|------|
| next | 16.x | MIT | 웹 프레임워크 |
| react | 19.x | MIT | UI 라이브러리 |
| typescript | 5.x | Apache-2.0 | 언어 |
| tailwindcss | 4.x | MIT | CSS 프레임워크 |
| prisma | 6.x | Apache-2.0 | ORM |
| zustand | 5.x | MIT | 상태 관리 |
| @tanstack/react-query | 5.x | MIT | 서버 상태 |
| socket.io | 4.x | MIT | 실시간 통신 |
| bcrypt | 5.x | MIT | 비밀번호 해싱 |
| zod | 3.x | MIT | 입력 검증 |
| lucide-react | latest | ISC | 아이콘 |
| next-themes | latest | MIT | 테마 관리 |
| framer-motion | 11.x | MIT | 애니메이션 |
| sanitize-html | 2.x | MIT | 입력 정화 |

### 5.2 라이선스 요약

- **MIT/Apache-2.0/ISC**: 상업적 사용 허가, 수정 및 배포 자유
- **주의사항**: 모든 의존성은 permissive 라이선스이며, copyleft(GPL 등) 의존성 없음
- **면책 조항**: 타사 소프트웨어은 작자 "있는 그대로" 제공되며, 어떤 보증도 하지 않음

---

## 6. Privacy Notice (개인정보 처리 공지) — 시니어 사용자 대상

### 6.1 수집하는 개인정보

| 항목 | 수집 목적 | 보유 기간 | 법적 근거 |
|------|-----------|-----------|-----------|
| 로그인 정보 (ID, 비밀번호 해시) | 서비스 이용 | 탈퇴 시까지 | 계약 이행 |
| 접속 로그 (IP, 시간) | 보안, 통계 | 90일 | 정당한 이익 |
| 대화 내용 (챗봇) | 서비스 제공 | 30일 후 자동 삭제 | 계약 이행 |
| 접근성 설정 (폰트, TTS) | 사용자 맞춤 | 브라우저 저장소 | 동의 |
| 사용 통계 (기능 이용 빈도) | 서비스 개선 | 1년 후 익명화 | 정당한 이익 |

### 6.2 개인정보 보호 조치

- **전송 구간 암호화**: HTTPS (TLS 1.3)
- **저장 시 암호화**: 비밀번호 bcrypt 해싱
- **접근 통제**: RBAC (최소 권한 원칙)
- **PII 마스킹**: 로그에 개인식별정보 마스킹 처리
- **데이터 최소화**: 필요 최소한의 정보만 수집
- **자동 삭제**: 대화 내용 30일 후 자동 삭제

### 6.3 시니어 사용자 권리 안내

- **열람권**: 본인 정보 확인 요청 가능
- **정정권**: 부정확한 정보 수정 요청 가능
- **삭제권**: 탈퇴 시 모든 정보 삭제 요청 가능
- **처리정지권**: 개인정보 처리 중지 요청 가능
- **문의처**: 복지 서비스 데스크 (전화: 02-1234-5678)

---

## 7. Accessibility Compliance Notice (접근성 준수 공지)

### 7.1 준수 표준

- **KWCAG 2.2** (한국 웹 콘텐츠 접근성 지침 2.2)
- **WCAG 2.1 Level AA** (웹 콘텐츠 접근성 지침)
- **장애인 차별금지 및 권리구제에 관한 법률** (장차법)

### 7.2 준수 항목

| 지침 | 준수 수준 | 비고 |
|------|-----------|------|
| 1.1.1 비텍스트 콘텐츠 | AA | 모든 이미지에 alt 텍스트 제공 |
| 1.3.1 정보 및 관계 | AA | 시맨틱 HTML 구조 사용 |
| 1.4.3 대비 (최소한) | AA | 일반 4.5:1, 대형 3:1 |
| 1.4.4 텍스트 크기 조절 | AA | 최대 200%까지 확대 가능 |
| 2.1.1 키보드 | AA | 모든 기능 키보드로 조작 가능 |
| 2.4.3 초점 순서 | AA | 논리적 초점 이동 순서 |
| 2.4.7 초점 표시 | AA | 초점 표시 항상 visible |
| 3.1.1 페이지 언어 | AA | `lang="ko"` 설정 |
| 3.3.1 오류 식별 | AA | 폼 오류 항목별 식별 |
| 4.1.2 이름, 역할, 값 | AA | ARIA 속성 적절 사용 |

### 7.3 추가 접근성 기능 (KWCAG 추가)

- **음성 낭독 (TTS)**: 모든 텍스트 음성 출력 가능
- **음성 입력 (STT)**: 음성으로 명령 입력 가능
- **고대비 모드**: 명암비 강화 모드 제공
- **대형 터치 타겟**: 최소 48px, 권장 64px
- **단순 탐색**: 3단계 이내 핵심 기능 접근
- **오류 복구 가이드**: 오류 발생 시 복구 방법 안내

### 7.4 한계 및 예외

- 실시간 AI 챗봇 응답은 100% 접근성 보장 어려움 (응답 시간 변동)
- 외부 임베드 콘텐츠 (PDF 링크 등)은 본 프로젝트 접근성 범위 외
- 브라우저 제한: Internet Explorer 미지원

---

*최종 업데이트: 2025-08-12 | 버전: 2.1.0*
