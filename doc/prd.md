# PRD (Product Requirements Document)

## AI 플랫폼 관리자 대시보드 — 제품 요구사항 정의서

| 항목 | 내용 |
|------|------|
| 제품명 | AI 플랫폼 관리자 대시보드 |
| 버전 | 2.1.0 |
| 작성일 | 2025-08-12 |
| 상태 | 개발 완료 |

---

## 1. 개요

### 1.1 비전
AI 플랫폼의 모든 프론트엔드 콘텐츠(텍스트, 이미지, 설정)를 관리자 대시보드에서 실시간으로 편집할 수 있는 CMS(콘텐츠 관리 시스템)를 내장하고, 사용자 관리·권한 제어·감사 로그·사이트 설정 등 엔터프라이즈급 관리 기능을 제공한다. PWA(프로그레시브 웹 앱)로 오프라인 지원·푸시 알림·홈 화면 설치를 지원하고, TWA(Trusted Web Activity)로 Android 앱 스토어 배포를 가능하게 한다. 키오스크(21"/32"), 태블릿, 모바일 등 다양한 디바이스 환경을 지원한다.

### 1.2 목표
- CMS를 통해 프론트엔드의 모든 텍스트·이미지를 코드 수정 없이 실시간 편집
- 역할 기반 접근 제어(RBAC)로 4단계 권한(superadmin/admin/editor/viewer) 관리
- 모든 관리 작업에 감사 로그(audit log) 기록으로 추적성 보장
- PWA로 오프라인 동작, 푸시 알림, 홈 화면 설치 지원
- TWA로 Android Play Store 배포 지원
- Hydration mismatch 방지로 SSR 안정성 보장
- 키오스크 모드 지원으로 전시·시니어 센터 등 특수 환경 대응
- SQLite 기반으로 설계하되 향후 PostgreSQL/MySQL 마이그레이션 가능

### 1.3 대상 사용자

| 사용자 유형 | 역할 | 주요 작업 |
|------------|------|----------|
| 최고 관리자 | superadmin | 전체 시스템 관리, 권한 설정, 사용자 관리, PWA 설정 |
| 관리자 | admin | 콘텐츠·사용자 관리, 설정 변경, 감사 로그 열람, 알림 관리 |
| 콘텐츠 편집자 | editor | 콘텐츠 생성·수정, 사이트 설정 열람 |
| 열람자 | viewer | 대시보드·콘텐츠 열람만 가능 |

---

## 2. 기능 요구사항

### 2.1 관리자 인증 (Admin Auth)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| AA-01 | 이메일/비밀번호로 로그인할 수 있다 | P0 | ✅ |
| AA-02 | Bearer 토큰 기반 세션 인증을 지원한다 | P0 | ✅ |
| AA-03 | 세션은 24시간 후 자동 만료된다 | P0 | ✅ |
| AA-04 | 로그아웃 시 세션이 즉시 삭제된다 | P0 | ✅ |
| AA-05 | 비밀번호는 bcrypt로 해시 저장된다 | P0 | ✅ |
| AA-06 | 비활성 계정으로는 로그인할 수 없다 | P1 | ✅ |
| AA-07 | 기본 관리자 계정(admin@aiplatform.kr/admin123)이 제공된다 | P0 | ✅ |

### 2.2 콘텐츠 관리 (CMS)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| CM-01 | 콘텐츠를 카테고리별로 조회할 수 있다 | P0 | ✅ |
| CM-02 | 새 콘텐츠를 생성할 수 있다 (key, category, type, value) | P0 | ✅ |
| CM-03 | 기존 콘텐츠를 수정할 수 있다 | P0 | ✅ |
| CM-04 | 콘텐츠를 삭제할 수 있다 (권한 필요) | P0 | ✅ |
| CM-05 | 콘텐츠 키로 단일 항목을 조회할 수 있다 | P0 | ✅ |
| CM-06 | 6가지 콘텐츠 타입을 지원한다 (text, image, rich_text, json, color, url) | P1 | ✅ |
| CM-07 | 카테고리별 탭 필터를 제공한다 | P1 | ✅ |
| CM-08 | 키/라벨 검색 기능을 제공한다 | P2 | ✅ |
| CM-09 | 프론트엔드에서 /api/cms/content로 공개 조회 가능하다 | P0 | ✅ |
| CM-10 | 콘텐츠 키 네이밍 컨벤션을 따른다 (예: home.hero.title) | P0 | ✅ |

### 2.3 사용자 관리 (User Management)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| UM-01 | 관리자 사용자 목록을 조회할 수 있다 | P0 | ✅ |
| UM-02 | 새 관리자 사용자를 생성할 수 있다 | P0 | ✅ |
| UM-03 | 사용자 정보를 수정할 수 있다 (이름, 역할, 활성 상태) | P0 | ✅ |
| UM-04 | 사용자를 삭제할 수 있다 | P0 | ✅ |
| UM-05 | 비밀번호 해시는 응답에 포함되지 않는다 | P0 | ✅ |
| UM-06 | 마지막 superadmin은 강등/삭제할 수 없다 | P0 | ✅ |
| UM-07 | 자기 자신을 삭제할 수 없다 | P1 | ✅ |
| UM-08 | 활성/비활성 토글 스위치를 제공한다 | P1 | ✅ |

### 2.4 권한 관리 (Role/Permission Management)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| RM-01 | 4개 역할의 권한을 조회할 수 있다 | P0 | ✅ |
| RM-02 | 역할별 권한을 수정할 수 있다 (superadmin만) | P0 | ✅ |
| RM-03 | 9가지 권한 항목을 지원한다 | P0 | ✅ |
| RM-04 | 권한 매트릭스 UI를 제공한다 | P1 | ✅ |

### 2.5 감사 로그 (Audit Log)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| AL-01 | 모든 생성·수정·삭제 작업이 자동 로깅된다 | P0 | ✅ |
| AL-02 | 로그인/로그아웃이 로깅된다 | P1 | ✅ |
| AL-03 | 감사 로그를 페이지네이션하여 조회할 수 있다 | P0 | ✅ |
| AL-04 | 액션·엔티티·사용자로 필터링할 수 있다 | P1 | ✅ |
| AL-05 | 변경 내용(changes)이 JSON으로 기록된다 | P1 | ✅ |

### 2.6 사이트 설정 (Site Config)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| SC-01 | 사이트 이름·설명을 편집할 수 있다 | P0 | ✅ |
| SC-02 | 로고 URL·파비콘 URL을 설정할 수 있다 | P1 | ✅ |
| SC-03 | 기본 색상을 설정할 수 있다 | P2 | ✅ |
| SC-04 | 레이아웃 모드를 선택할 수 있다 (auto/kiosk-21/kiosk-32/desktop/tablet/mobile) | P0 | ✅ |
| SC-05 | 언어를 설정할 수 있다 | P2 | ✅ |
| SC-06 | 유지보수 모드를 토글할 수 있다 | P1 | ✅ |
| SC-07 | Mock 모드를 토글할 수 있다 | P2 | ✅ |

### 2.7 키오스크 지원 (Kiosk Support)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| KS-01 | 21인치 키오스크(1080p) 레이아웃을 지원한다 | P0 | ✅ |
| KS-02 | 32인치 키오스크(1920p) 레이아웃을 지원한다 | P0 | ✅ |
| KS-03 | 키오스크 모드에서 폰트·터치 타겟이 확대된다 | P1 | ✅ |
| KS-04 | 화면 너비 기반 자동 키오스크 감지를 지원한다 | P1 | ✅ |
| KS-05 | 태블릿·모바일 반응형 레이아웃을 지원한다 | P0 | ✅ |

### 2.8 대시보드 통계 (Dashboard Stats)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| DS-01 | 콘텐츠·사용자·채팅·퀴즈·이미지 수를 표시한다 | P0 | ✅ |
| DS-02 | 최근 감사 로그 5건을 표시한다 | P1 | ✅ |
| DS-03 | 활동 막대 그래프를 표시한다 | P2 | ✅ |
| DS-04 | 활성 세션 수를 표시한다 | P1 | ✅ |

### 2.9 PWA 지원 (Progressive Web App)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| PW-01 | 웹 앱 설치 프롬프트를 표시하고 설치를 지원한다 | P0 | ✅ |
| PW-02 | Web App Manifest를 제공한다 (name, icons, shortcuts, screenshots, share_target, protocol_handlers) | P0 | ✅ |
| PW-03 | Service Worker를 등록하고 4티어 캐시 전략을 적용한다 (static, dynamic, images, API) | P0 | ✅ |
| PW-04 | 오프라인 시 오프라인 표시기(OfflineIndicator)를 표시한다 | P0 | ✅ |
| PW-05 | 오프라인 페이지(/offline.html)를 제공한다 | P1 | ✅ |
| PW-06 | 푸시 알림 구독/수신을 지원한다 | P1 | ✅ |
| PW-07 | 백그라운드 동기화(Sync API)를 지원한다 | P2 | ✅ |
| PW-08 | PWA 설치 배너(PWAInstallBanner) 컴포넌트를 제공한다 | P1 | ✅ |
| PW-09 | PWA 알림 관리(PWANotificationManager) 컴포넌트를 제공한다 | P1 | ✅ |
| PW-10 | PWA 설정 패널(PWASettingsPanel)에서 캐시·SW·알림을 관리할 수 있다 | P2 | ✅ |
| PW-11 | 온라인/오프라인 상태를 실시간으로 감지한다 | P0 | ✅ |
| PW-12 | PWA 관련 보안 헤더를 설정한다 (SW-Allowed, manifest Content-Type, HSTS) | P0 | ✅ |

### 2.10 TWA 지원 (Trusted Web Activity)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| TW-01 | Digital Asset Links(.well-known/assetlinks.json)를 제공한다 | P0 | ✅ |
| TW-02 | Bubblewrap 설정(bubblewrap-config.json)을 제공한다 | P0 | ✅ |
| TW-03 | TWA 빌드 가이드(BUILD_GUIDE.md)를 제공한다 | P1 | ✅ |
| TW-04 | 패키지명은 kr.ai.platform.twa로 설정한다 | P0 | ✅ |
| TW-05 | PWA가 TWA 환경에서 정상 동작한다 | P0 | ✅ |

### 2.11 Hydration 안전 (Hydration Safety)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| HS-01 | useClientValue 패턴으로 SSR/CSR hydration mismatch를 방지한다 | P0 | ✅ |
| HS-02 | useHydrated 훅으로 hydration 완료 여부를 감지한다 | P0 | ✅ |
| HS-03 | Radix UI aria-controls ID mismatch를 방지한다 | P0 | ✅ |
| HS-04 | 브라우저 전용 API(navigator, window, localStorage)를 안전하게 호출한다 | P0 | ✅ |
| HS-05 | useSyncExternalStore 기반으로 서버/클라이언트 값을 분리한다 | P0 | ✅ |
| HS-06 | PWA, Voice, Admin Auth 훅에 hydration 안전 패턴을 적용한다 | P1 | ✅ |

---

## 3. 비기능 요구사항

| ID | 요구사항 | 목표 |
|----|---------|------|
| NF-01 | 인증 보안 | bcrypt 해시, 세션 토큰(UUID), 24h TTL, HTTPS |
| NF-02 | 권한 제어 | 모든 API 라우트에서 RBAC 검사, 최소 권한 원칙 |
| NF-03 | 감사 추적성 | 모든 변경 작업 로깅, 변경 내용 JSON 저장 |
| NF-04 | 응답 시간 | 관리 API < 500ms, CMS 공개 API < 200ms |
| NF-05 | 반응형 | 모바일/태블릿/데스크톱/키오스크 대응 |
| NF-06 | 접근성 | WCAG 2.1 AA 준수, 큰 폰트, 터치 타겟 44px+ |
| NF-07 | 데이터 보호 | passwordHash 응답 제외, 세션 인메모리 저장 |
| NF-08 | 확장성 | SQLite → PostgreSQL 마이그레이션 가능 구조 |
| NF-09 | 오프라인 동작 | Service Worker 캐시로 오프라인 시 핵심 기능 사용 가능 |
| NF-10 | Hydration 안전 | useClientValue 패턴으로 SSR mismatch 제로 |
| NF-11 | PWA 성능 | Lighthouse PWA 점수 ≥ 90, 캐시 적중률 ≥ 80% |

---

## 4. 제약사항

- 단일 페이지 애플리케이션 (Next.js App Router, / 라우트만 노출)
- SQLite 데이터베이스 (Prisma ORM), 향후 PostgreSQL/MySQL 마이그레이션 예정
- 인메모리 세션 스토어 (서버 재시작 시 세션 초기화)
- JWT 미사용, Bearer 토큰(UUID) + 서버 인메모리 세션
- 외부 API 호출은 서버 사이드에서만 수행
- 환경 제약: 포트 3000만 사용, Caddy 게이트웨이를 통한 외부 노출
- 키오스크 감지는 클라이언트 사이드 window.innerWidth 기반
- reactStrictMode: false (PWA/Service Worker 호환성)
- TWA는 Android만 지원 (iOS는 PWA 설치 방식 사용)

---

## 5. 마일스톤

| 단계 | 내용 | 상태 |
|------|------|------|
| M1 | Prisma 스키마 확장 (AdminUser, Content, SiteConfig, AuditLog, Permission) | ✅ |
| M2 | 관리자 인증 시스템 (bcrypt, 세션, RBAC) 구현 | ✅ |
| M3 | CMS 콘텐츠 관리 API + 공개 API 구현 | ✅ |
| M4 | 사용자·권한·감사 로그·사이트 설정 API 구현 | ✅ |
| M5 | 관리자 대시보드 UI 컴포넌트 구현 | ✅ |
| M6 | 키오스크 대응 및 반응형 UI 최적화 | ✅ |
| M7 | 보안 강화, 접근성, 프로덕션 검증 | ✅ |
| M8 | PWA 구현 (Service Worker, Manifest, 설치 배너, 오프라인 지원) | ✅ |
| M9 | PWA 푸시 알림 + 캐시 관리 UI 구현 | ✅ |
| M10 | Hydration mismatch 수정 (useClientValue/useHydrated 패턴) | ✅ |
| M11 | TWA 설정 (Digital Asset Links, Bubblewrap) | ✅ |
| M12 | DB 모델 확장 (Notification, UserActivity, ContentVersion, OnboardingProgress) | ✅ |
| M13 | 추가 API 구현 (알림, 활동, 권한 상세, Mock 데이터) | ✅ |
| M14 | PostgreSQL 마이그레이션 준비 및 SSO 확장 | 🔜 |
