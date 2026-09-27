# PRD (Product Requirements Document)

## AI Platform Backend Admin Dashboard — 시니어 사용자 특화

---

## 1. 프로젝트 개요

본 프로젝트는 **시니어(60세 이상) 사용자**를 주요 타겟으로 하는 AI 플랫폼의 Backend Admin Dashboard를 설계 및 구현하는 것을 목표로 한다. 시니어 사용자의 디지털 접근성 한계를 최소화하고, 직관적이고 안전한 관리 환경을 제공한다.

### 1.1 비전

> "모든 세대가 쉽게 사용할 수 있는 AI 관리 플랫폼"

시니어 사용자도 관리자 권한으로 콘텐츠를 운영하고, AI 기능을 제어하며, 플랫폼 상태를 모니터링할 수 있는 통합 Dashboard를 제공한다.

### 1.2 핵심 가치

| 가치 | 설명 |
|------|------|
| 접근성 (Accessibility) | WCAG 2.1 AA 준수, 고대비 모드, 큰 글씨 지원 |
| 안전성 (Security) | RBAC 기반 권한 제어, 감사 로그, 세션 보안 |
| 단순성 (Simplicity) | 최소 클릭 원칙, 명확한 네비게이션, 음성 안내 |
| 신뢰성 (Reliability) | 99.9% 가용성, 자동 장애 복구, 실시간 동기화 |

---

## 2. 타겟 사용자

### 2.1 주요 사용자: 시니어 관리자 (60세 이상)

| 특성 | 고려 사항 |
|------|-----------|
| 시력 저하 | 최소 18px 폰트, 고대비 색상, 줌 지원 |
| 운동 능림 | 큰 터치 타겟 (44px 이상), 키보드 네비게이션 |
| 디지털 친숙도 낮음 | 단순한 UI, 툴팁/가이드, 온보딩 프로세스 |
| 인지 부담 | 최소 정보량 원칙, 단계별 진행, 확인 다이얼로그 |
| 청력 저하 | 시각적 알림 우선, 자막 지원 |

### 2.2 보조 사용자

- **일반 시니어 사용자**: AI 채팅, 퀴즈, 이미지 생성 기능 사용
- **운영 담당자 (40-59세)**: 시스템 모니터링, 콘텐츠 승인
- **개발자**: API 연동, 시스템 설정

---

## 3. 기능 요구사항 (Functional Requirements)

### 3.1 콘텐츠 관리 (Content Management)

| ID | 요구사항 | 우선순위 | 설명 |
|----|----------|----------|------|
| FR-CM-01 | CMS 콘텐츠 CRUD | P0 | 공지사항, 가이드, 도움말 등 콘텐츠 생성/수정/삭제 |
| FR-CM-02 | 콘텐츠 버전 관리 | P1 | 수정 이력 추적, 이전 버전 복원 |
| FR-CM-03 | 미디어 관리 | P1 | 이미지 업로드, 최적화, 대체 텍스트 자동 생성 |
| FR-CM-04 | 다국어 지원 | P2 | 한국어/영어 콘텐츠 관리 |
| FR-CM-05 | 콘텐츠 승인 워크플로우 | P1 | 작성 → 검토 → 승인 → 게시 흐름 |

### 3.2 역할 기반 접근 제어 (RBAC)

| ID | 요구사항 | 우선순위 | 설명 |
|----|----------|----------|------|
| FR-RB-01 | 역할 정의 | P0 | SuperAdmin, Admin, Editor, Viewer 역할 지원 |
| FR-RB-02 | 권한 관리 | P0 | 세분화된 권한 (읽기/쓰기/삭제/승인) 할당 |
| FR-RB-03 | 사용자-역할 매핑 | P0 | 다중 역할 할당 지원 |
| FR-RB-04 | 권한 상속 | P1 | 역할 계층 구조 기반 권한 상속 |
| FR-RB-05 | 동적 권한 확인 | P0 | API 요청 시 실시간 권한 검증 |

### 3.3 실시간 동기화 (Real-time Sync)

| ID | 요구사항 | 우선순위 | 설명 |
|----|----------|----------|------|
| FR-RT-01 | WebSocket 연결 | P0 | Socket.io 기반 실시간 양방향 통신 |
| FR-RT-02 | 알림 푸시 | P0 | 즉각적인 알림 전달 (시스템/콘텐츠/권한 변경) |
| FR-RT-03 | 상태 동기화 | P0 | 다중 탭/기기 간 상태 일관성 유지 |
| FR-RT-04 | 연결 복구 | P1 | 네트워크 단절 시 자동 재연결 및 상태 복원 |
| FR-RT-05 | 오프라인 큐 | P2 | 오프라인 중 작업 큐잉, 온라인 복귀 시 동기화 |

### 3.6 PWA (Progressive Web App)

| ID | 요구사항 | 우선순위 | 설명 |
|----|----------|----------|------|
| FR-PWA-01 | 서비스 워커 | P0 | 4계층 캐시 (static, dynamic, images, API), 오프라인 페이지 |
| FR-PWA-02 | 웹 앱 매니페스트 | P0 | 설치 가능, shortcuts, screenshots, share_target, protocol_handlers |
| FR-PWA-03 | 푸시 알림 | P1 | 백그라운드 동기, 푸시 알림 수신/처리 |
| FR-PWA-04 | 오프라인 지원 | P0 | 오프라인 표시기, 캐시 관리, 온/오프라인 상태 감지 |
| FR-PWA-05 | 설치 유도 | P1 | PWAInstallBanner, 설치 프롬프트, 앱 같은 경험 |

### 3.7 TWA (Trusted Web Activity)

| ID | 요구사항 | 우선순위 | 설명 |
|----|----------|----------|------|
| FR-TWA-01 | Digital Asset Links | P1 | 공개 검증 가능한 소유권 증명 (assetlinks.json) |
| FR-TWA-02 | Android 래퍼 | P2 | Bubblewrap 기반 TWA 빌드, 패키지: kr.ai.platform.twa |
| FR-TWA-03 | Play Store 배포 | P2 | TWA APK 빌드 가이드, 서명 구성 |

### 3.8 Hydration 안전성 (SSR Hydration Safety)

| ID | 요구사항 | 우선순위 | 설명 |
|----|----------|----------|------|
| FR-HYD-01 | useClientValue | P0 | useSyncExternalStore 기반 SSR/CSR 값 분리, hydration mismatch 방지 |
| FR-HYD-02 | useHydrated | P0 | 클라이언트 hydration 완료 여부 감지 |
| FR-HYD-03 | Radix UI 호환 | P0 | aria-controls ID mismatch 방지, SSR에서 안전한 ID 생성 |
| FR-HYD-04 | reactStrictMode 비활성 | P1 | PWA/Service Worker 호환성을 위해 reactStrictMode: false |

### 3.4 접근성 기능 (Accessibility)

| ID | 요구사항 | 우선순위 | 설명 |
|----|----------|----------|------|
| FR-A11Y-01 | 고대비 모드 | P0 | 명앱비 4.5:1 이상 보장 |
| FR-A11Y-02 | 폰트 크기 조절 | P0 | 18px~32px 범위 확대/축소 |
| FR-A11Y-03 | 키보드 네비게이션 | P0 | 모든 기능 키보드만으로 조작 가능 |
| FR-A11Y-04 | 스크린 리더 지원 | P0 | ARIA 속성, 시맨틱 HTML |
| FR-A11Y-05 | 음성 안내 | P1 | 주요 액션 음성 피드백 (TTS) |
| FR-A11Y-06 | 포커스 표시 | P0 | 명확한 포커스 링, 포커스 트랩 |

### 3.5 AI 기능 관리

| ID | 요구사항 | 우선순위 | 설명 |
|----|----------|----------|------|
| FR-AI-01 | AI Provider 설정 | P0 | 다중 AI Provider 활성/비활성, 우선순위 설정 |
| FR-AI-02 | 프롬프트 관리 | P0 | 시스템 프롬프트 CRUD, 버전 관리 |
| FR-AI-03 | 사용량 모니터링 | P1 | API 호출 수, 토큰 사용량, 비용 추적 |
| FR-AI-04 | Rate Limiting | P0 | 사용자/역할별 요청 제한 설정 |

---

## 4. 비기능 요구사항 (Non-Functional Requirements)

### 4.1 성능 (Performance)

| ID | 요구사항 | 목표 |
|----|----------|------|
| NFR-P-01 | 초기 로딩 시간 | 3초 이내 (3G 네트워크 기준) |
| NFR-P-02 | API 응답 시간 | 200ms 이내 (P95) |
| NFR-P-03 | Time to Interactive | 5초 이내 |
| NFR-P-04 | 동시 사용자 지원 | 500명 동시 접속 |
| NFR-P-05 | 메모리 사용량 | 클라이언트 100MB 이하 |

### 4.2 보안 (Security)

| ID | 요구사항 | 설명 |
|----|----------|------|
| NFR-S-01 | HTTPS 강제 | 모든 통신 TLS 1.3 암호화 |
| NFR-S-02 | 인증 토큰 | JWT + HttpOnly Cookie, 30분 만료 |
| NFR-S-03 | CSRF 보호 | SameSite 쿠키 + 토큰 검증 |
| NFR-S-04 | 입력 검증 | Zod 스키마 기반 서버 사이드 검증 |
| NFR-S-05 | 감사 로그 | 모든 관리 액션 기록 (변경 전/후) |
| NFR-S-06 | Rate Limiting | IP/사용자별 요청 제한 (100/min) |
| NFR-S-07 | SQL Injection 방지 | Prisma ORM 파라미터화 쿼리 |

### 4.3 접근성 (Accessibility — WCAG 2.1 AA)

| ID | 요구사항 | WCAG 기준 |
|----|----------|-----------|
| NFR-A-01 | 인식 가능 | 1.1.1 Non-text Content, 1.4.3 Contrast |
| NFR-A-02 | 운용 가능 | 2.1.1 Keyboard, 2.4.3 Focus Order |
| NFR-A-03 | 이해 가능 | 3.1.1 Language, 3.3.1 Error Identification |
| NFR-A-04 | 내 견고성 | 4.1.1 Parsing, 4.1.2 Name/Role/Value |
| NFR-A-05 | 반응형 디자인 | 모든 뷰포트 (320px~4K) 대응 |

### 4.4 가용성 (Availability)

| ID | 요구사항 | 목표 |
|----|----------|------|
| NFR-AV-01 | 가용률 | 99.9% (월 43분 다운타임 허용) |
| NFR-AV-02 | 장애 복구 | RTO 5분, RPO 1분 |
| NFR-AV-03 | 데이터 백업 | 일일 자동 백업, 30일 보존 |

---

## 5. 마일스톤 (Milestones)

| 단계 | 기간 | 주요 산출물 | 상태 |
|------|------|-------------|------|
| M1: 기반 구축 | 1-2주 | 프로젝트 설정, DB Schema, 인증 시스템 | 완료 |
| M2: 핵심 기능 | 3-4주 | CMS, RBAC, 기본 Dashboard | 완료 |
| M3: AI 통합 | 5-6주 | Multi-provider AI, 프롬프트 관리 | 완료 |
| M4: 실시간 | 7-8주 | WebSocket 알림, 상태 동기화 | 완료 |
| M5: 접근성 | 9-10주 | WCAG 준수, 음성 안내, 온보딩 | 완료 |
| M6: 최적화 | 11-12주 | 성능 튜닝, 보안 강화, 부하 테스트 | 완료 |
| M7: PWA/TWA | 13-14주 | 서비스 워커, 매니페스트, 푸시 알림, TWA 래퍼 | 완료 |
| M8: Hydration 안전성 | 15-16주 | useClientValue, useHydrated, Radix UI 호환, StrictMode 조정 | 완료 |

---

## 6. 수용 기준 (Acceptance Criteria)

### 6.1 기능 수용 기준

- [x] 모든 CRUD 작업이 정상 동작하고 감사 로그에 기록됨
- [x] RBAC 권한이 올바르게 적용됨 (미권한 시 403 반환)
- [x] WebSocket 연결이 99% 안정적으로 유지됨
- [x] 고대비 모드 전환 시 모든 텍스트 가독성 유지
- [x] 키보드만으로 모든 관리 기능 조작 가능
- [x] PWA 설치 및 오프라인 동작 확인
- [x] Hydration mismatch 발생하지 않음 (useClientValue 적용)
- [x] Service Worker 4계층 캐시 정상 동작

### 6.2 비기능 수용 기준

- [x] Lighthouse 접근성 점수 90점 이상
- [x] Lighthouse 성능 점수 80점 이상
- [x] WCAG 2.1 AA 자동 검증 통과률 100%
- [x] API 응답 시간 P95 < 200ms
- [x] 보안 취약점 스캔 0건 (Critical/High)
- [x] 시니어 사용자 태스크 완료율 > 90% (사용성 테스트)
- [x] PWA Lighthouse 점수 (Installable, Offline) 통과
- [x] Hydration 경고 0건 (production build)

### 6.3 시니어 특화 수용 기준

- [x] 60세 이상 사용자가 가이드 없이 기본 작업 완료 가능
- [x] 폰트 24px 설정 시 레이아웃 깨짐 없음
- [x] 음성 안내가 모든 주요 액션에 대해 제공됨
- [x] 온보딩 완료 후 첫 작업까지 평균 30초 이내
- [x] 오류 메시지가 이해하기 쉬운 한국어로 제공됨
- [x] PWA 오프라인에서도 기본 기능 사용 가능

---

## 7. 제약 사항

| 항목 | 제약 |
|------|------|
| 브라우저 지원 | Chrome 90+, Safari 14+, Edge 90+ (IE 미지원), PWA 설치 지원 |
| 네트워크 | 최소 3G 환경 동작 보장 |
| 언어 | 한국어 (기본), 영어 (선택) |
| 데이터 | 개인정보 수집 최소화 원칙 |
| 외부 의존 | AI Provider API 가용성에 종속 |

---

## 8. 용어 정의

| 용어 | 정의 |
|------|------|
| 시니어 | 60세 이상의 사용자 |
| RBAC | Role-Based Access Control, 역할 기반 접근 제어 |
| WCAG | Web Content Accessibility Guidelines |
| CMS | Content Management System, 콘텐츠 관리 시스템 |
| TTI | Time to Interactive |
| RTO | Recovery Time Objective |
| RPO | Recovery Point Objective |
| PWA | Progressive Web App, 점진적 웹 앱 |
| TWA | Trusted Web Activity, Android 앱 래퍼 |
| SW | Service Worker, 서비스 워커 |
| Hydration | SSR → CSR 전환 시 React hydration 프로세스 |
