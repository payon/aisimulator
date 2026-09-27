# Changes and Additional Implementations (변경 및 추가 구현 로그)

> 본 문서는 원래 요구사항을 넘어 추가로 구현한 기능, 구현 결정 사항, 향후 개선 제안을 기록합니다.
> 프로젝트 발전 과정에서의 설계 결정과 확장 내용을 추적합니다.

---

## 1. Additions Beyond Original Request (원 요구사항 외 추가 구현)

### 1.1 알림 시스템 (Notification System)

**추가 이유:**
- 시니어 사용자에게 중요한 복지 정보 갱신을 능지 않고 전달 필요
- 시스템 점검, 혜택 마감 등 시간 민감 정보에 대한 적시 알림
- 관리자에게 보안 이벤트(로그인 실패, 권한 거부) 즉시 통보

**구현 내용:**
```typescript
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;       // 알림 클릭 시 이동 URL
  expiresAt?: string;       // 알림 만료 시간
  createdAt: string;
}
```

- 읽지 않은 알림 뱃지 (Header에 표시)
- 알림 목록 팝오버 (최근 20개)
- TTS로 알림 내용 읽어주기 옵션
- WebSocket을 통한 실시간 알림 수신

**시니어 고려사항:**
- 알림 팝업은 화면 중앙 대형 모달 (작은 toast는 놓치기 쉬움)
- 음성 안내: "새로운 알림이 있습니다: [내용]"
- 알림 만료: 7일 후 자동 삭제 (알림 누적 방지)

---

### 1.2 빠른 실행 바 (Quick Action Bar)

**추가 이유:**
- 시니어 사용자의 주요 작업(전화 상담, 가까운 복지관 찾기, 자주 보는 정보)을 1클릭으로 접근
- 복잡한 탐색 경로 단축
- 키오스크에서 가장 많이 쓰는 기능 빠른 접근

**구현 내용:**
```typescript
interface QuickAction {
  id: string;
  label: string;           // "전화 상담"
  icon: LucideIcon;        // Phone
  action: () => void;
  category: 'contact' | 'info' | 'service' | 'settings';
  voiceHint: string;       // "전화 상담을 연결합니다"
}
```

**기본 빠른 실행 항목:**
| 항목 | 아이콘 | 동작 |
|------|--------|------|
| 전화 상담 | 📞 | 복지 콜센터 전화 연결 (tel:) |
| 가까운 복지관 | 📍 | 지도 기반 가까운 복지관 표시 |
| AI 상담사 | 🤖 | 챗봇 탭으로 이동 |
| 글자 크기 | 🔤 | 폰트 크기 설정 팝업 |
| 음성 안내 | 🔊 | TTS 켜기/끄기 |

---

### 1.3 시니어 온보딩 (Senior Onboarding)

**추가 이유:**
- 디지털 역량이 낮은 시니어 사용자의 첫 이용 장벽 제거
- 접근성 설정(폰트, TTS)을 사전에 구성하여 즉시 최적화된 경험 제공
- 서비스 이용 방법을 단계별로 안내하여 이탈 방지

**구현 내용:**
- 5단계 가이드 (환영 → 폰트 선택 → 음성 설정 → 기능 안내 → 시작)
- 각 단계 TTS 음성 안내
- 진행 상태 표시 (단계 표시기)
- "건너뛰기" 옵션 (숙련자용)
- 온보딩 완료 상태 localStorage 저장 (재방문 시 미표시)
- 설정 초기화 시 온보딩 재표시 옵션

---

### 1.4 콘텐츠 버전 관리 (Content Versioning)

**추가 이유:**
- 복지 정보의 정확성이 시니어 사용자에게 직결적 영향
- 정보 수정 이력 추적 필요 (감사 추적)
- 잘못된 정보 게시 시 이전 버전으로 롤백 필요

**구현 내용:**
```typescript
interface ContentVersion {
  id: string;
  contentId: string;
  version: number;
  title: string;
  body: string;
  snapshot: ContentItem;    // 전체 스냅샷
  createdAt: string;
  authorId: string;
  changeNote?: string;     // "연금액 수정 반영"
}
```

- 수정 시 자동 버전 생성
- 버전 간 diff 비교 기능
- 특정 버전으로 롤백
- 최대 50버전 보관 (초과 시 가장 오래된 버전 삭제)

---

### 1.5 사용량 분석 (Usage Analytics)

**추가 이유:**
- 시니어 사용자의 실제 이용 패턴 파악 → UI 개선 근거
- 인기 콘텐츠 파악 → 정보 제공 우선순위 결정
- 접근성 기능(TTS, 음성입력) 사용률 측정 → 투자 우선순위

**구현 내용:**
```typescript
interface UsageEvent {
  eventType: 'page_view' | 'feature_use' | 'tts_use' | 'voice_input' | 'content_read';
  target: string;           // 탭 ID, 콘텐츠 ID 등
  duration?: number;        // 체류 시간 (ms)
  timestamp: string;
  sessionId: string;
  deviceInfo: {
    type: 'mobile' | 'tablet' | 'desktop' | 'kiosk';
    screenWidth: number;
    fontSize: string;
  };
}
```

**수집 항목 (개인정보 최소화):**
- 탭별 체류 시간
- TTS/STT 사용 빈도
- 폰트 크기 설정 분포
- 키오스크 vs 일반 접근 비율
- 인기 검색어 (상위 20개)
- AI 챗봇 질문 카테고리 분포

**주의:** 개인식별정보(PII)는 수집하지 않으며, 모든 데이터는 익명화하여 저장

---

### 1.6 음성 입력 / STT (Voice Input / Speech-to-Text)

**추가 이유:**
- 타이핑이 어려운 시니어 사용자의 주요 입력 장벽 제거
- 키오스크 터치 환경에서 가상 키보드 불편함 해소
- 자연스러운 한국어 질문으로 AI 챗봇 접근성 향상

**구현 내용:**
- Web Speech API 기반 (별외 서버 의존성 없음)
- `useVoiceInput` 커스텀 훅 추상화
- 실시간 인식 결과 표시 (interim results)
- 시각적 피드백 (녹음 중 파형 애니메이션)
- 인식 결과 확인 단계 (시니어 친화적)
- 수동 편집 가능 (인식 오류 대응)

**브라우저 지원:**
| 브라우저 | 지원 여부 | 비고 |
|----------|-----------|------|
| Chrome | ✅ | 권장 |
| Edge | ✅ | Chromium 기반 |
| Safari | ⚠️ | 간헐적 지원 |
| Firefox | ❌ | 미지원 |

---

### 1.7 관리자 분리 (Admin Separation)

**추가 이유:**
- 일반 사용자(시니어)와 관리자의 UI/UX 요구사항 완전히 상이
- 관리자 화면의 복잡도가 시니어 사용자에게 혼란 야기
- 보안: 관리자 기능과 일반 기능의 명확한 경계 필요

**구현 내용:**
- 관리자는 별도 로그인 흐름 (/admin 경로 또는 설정 내 관리자 메뉴)
- RBAC: 4개 역할 (super_admin, admin, editor, viewer)
- 관리자 대시보드: 사용자 관리, 콘텐츠 관리, 감사 로그, 분석
- 일반 사용자에게 관리자 메뉴 비표시 (권한 없는 경우)
- 관리자 세션: 짧은 TTL (4시간), 더 엄격한 Rate Limit

---

## 2. Implementation Decisions (구현 결정 사항)

### 2.1 In-memory 세션 vs Redis

| 기준 | In-memory | Redis |
|------|-----------|-------|
| 복잡도 | 낮음 (추가 의존성 없음) | 높음 (Redis 서버 필요) |
| 확장성 | 단일 서버 제한 | 다중 서버 지원 |
| 지속성 | 서버 재시작 시 초기화 | 영속 가능 |
| 현재 결정 | ✅ In-memory | 향후 전환 고려 |

**결정 이유:** 초기 단계에서는 단일 서저 충분, 의존성 최소화 우선. 동시 사용자 100명 이상 시 Redis 전환.

### 2.2 Web Speech API vs 클라우드 STT

| 기준 | Web Speech API | 클라우드 STT |
|------|----------------|-------------|
| 비용 | 무료 | 건당 과금 |
| 오프라인 | 부분 지원 | 미지원 |
| 정확도 | 보통 (브라우저 의존) | 높음 |
| 한국어 | Chrome에서 지원 | 광범위 지원 |
| 현재 결정 | ✅ Web Speech API | 향후 옵션 |

**결정 이유:** 비용 없음, 추가 서버 불필요, Chrome에서 한국어 인식 품질 양호. 정확도 요구사항 증가 시 클라우드 STT (Whisper 등)로 전환.

### 2.3 SQLite vs PostgreSQL

| 기준 | SQLite | PostgreSQL |
|------|--------|------------|
| 설정 | 없음 (파일 DB) | 서버 설정 필요 |
| 동시 쓰기 | 단일 쓰기 | 다중 동시 쓰기 |
| 배포 | 파일 복사만 | DB 서버 구축 |
| 현재 결정 | ✅ SQLite | 향후 전환 고려 |

**결정 이유:** Prisma 기본 설정, 초기 단계 동시 쓰기 부하 낮음, 배포 단순. 트래픽 증가 시 PostgreSQL 전환.

### 2.4 Zustand vs Redux

**결정: Zustand** — 보일러플레이트 적음, TypeScript 친화적, 번들 크기 작음, 학습 곡선 완만.

### 2.5 TanStack Query vs SWR

**결정: TanStack Query** — 더 강력한 캐시 제어, Optimistic Update 지원, 무한 스크롤 내장, DevTools 유용.

---

## 3. Future Enhancement Suggestions (향후 개선 제안)

### 3.1 단기 (v2.1) — ✅ 구현 완료

| 우선순위 | 제안 | 상태 | 구현 내용 |
|----------|------|------|------------|
| 🔴 High | 오프라인 모드 (Service Worker) | ✅ 완료 | 4계층 캐시, 오프라인 페이지, 백그라운드 동기 |
| 🔴 High | PWA 설치 지원 | ✅ 완료 | manifest.json, InstallBanner, 앱 같은 경험 |
| 🟡 Medium | 클라우드 STT 옵션 | 보류 | 음성 인식 정확도 향상 |
| 🟡 Medium | 다국어 지원 (i18n) | 보류 | 다문화 가정 시니어 대상 |
| 🟢 Low | 인쇄 최적화 CSS | 보류 | 복지 정보 인쇄 수요 |

### 3.2 중기 (v1.5)

| 우선순위 | 제안 | 근거 |
|----------|------|------|
| 🔴 High | Redis 세션 스토어 전환 | 다중 서버 확장 |
| 🔴 High | PostgreSQL 전환 | 동시 쓰기 성능 |
| 🟡 Medium | 실시간 영상 통역 (WebRTC) | 원격 복지 상담 |
| 🟡 Medium | 챗봇 대화 이력 저장/검색 | 이전 상담 내용 참조 |
| 🟢 Low | 다크모드 개선 | 야간 사용 대응 |

### 3.3 장기 (v2.0)

| 우선순위 | 제안 | 근거 |
|----------|------|------|
| 🔴 High | 모바일 네이티브 앱 (React Native) | 푸시 알림, 더 나은 성능 |
| 🟡 Medium | AI 개인화 추천 | 사용자 관심사 기반 정보 추천 |
| 🟡 Medium | 복지 혜택 자동 매칭 | 사용자 프로필 → 적용 가능 혜택 자동 탐색 |
| 🟢 Low | 커뮤니티 기능 | 시니어 사용자 간 정보 공유 |

### 3.4 기술 부채

| 항목 | 설명 | 해결 시점 |
|------|------|-----------|
| In-memory 세션 | 서버 재시작 시 세션 초기화 | v1.5 (Redis 전환) |
| 입력 검증 미비 | 일부 API 엔드포인트 Zod 스키마 미적용 | v1.0.1 |
| E2E 테스트 부재 | Cypress/Playwright 테스트 없음 | v1.1 |
| API 문서 자동화 | OpenAPI/Swagger 스펙 미생성 | v1.1 |
| 로깅 표준화 | 구조화 로깅 (JSON) 미적용 | v1.0.1 |

---

## 4. Architecture Decision Records (ADR)

### ADR-001: App Router vs Pages Router
- **상황**: Next.js 프로젝트 구조 선택
- **결정**: App Router 채택
- **이유**: React Server Components 지원, 중첩 레이아웃, 스트리밍 SSR, 향전 기능

### ADR-002: 클라이언트 상태 관리 도구
- **상황**: 글로벌 상태 관리 라이브러리 선택
- **결정**: Zustand
- **이유**: 보일러플레이트 최소, TypeScript 친화적, 번들 크기 1KB, React 19 호환

### ADR-003: 실시간 통신 방식
- **상황**: 서버-클라이언트 실시간 통신 방식 선택
- **결정**: Socket.io (WebSocket + 폴링 폴백)
- **이유**: 자동 재연결, 방 관리, 브라우저 호환성, 폴링 폴백

### ADR-004: AI API 통합 방식
- **상황**: AI 챗봇 백엔드 구현 방식 선택
- **결정**: z-ai-web-dev-sdk (서버 전용)
- **이유**: 프롬프트 관리, 응답 후처리, Rate Limit, 감사 로깅을 서버에서 통제

### ADR-006: PWA vs 네이티브 앱
- **상황**: 모바일 환경 지원 방식 선택
- **결정**: PWA (Progressive Web App) + TWA (Trusted Web Activity)
- **이유**: 단일 코드베이스, 즉시 업데이트, 설치 가능, 오프라인 지원, TWA로 Android Play Store 배포

### ADR-007: Hydration 안전성 접근
- **상황**: SSR/CSR hydration mismatch로 인한 Radix UI ID 충돌
- **결정**: useSyncExternalStore 기반 useClientValue 훅 도입
- **이유**: React 공식 hydration 안전 패턴, SSR에서 서버 값 반환 후 CSR에서 클라이언트 값으로 전환

### ADR-008: reactStrictMode 비활성
- **상황**: PWA Service Worker와 React StrictMode 이중 렌더링 충돌
- **결정**: `reactStrictMode: false` 설정
- **이유**: Service Worker 등록 중복 방지, PWA 초기화 안정성 확보

---

*최종 업데이트: 2025-08-12 | 버전: 2.1.0*
