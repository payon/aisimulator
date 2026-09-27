# Test Harness 설계 (HARNESS)

## 1. 개요

본 문서는 AI 플랫폼의 Test Harness 설계를 정의합니다. Test Harness는 단위 테스트, 통합 테스트,
E2E 테스트를 포함한 전체 테스트 인프라를 아우르며, CI/CD Pipeline과 연동되어 지속적 품질 보증을
실현합니다. 모든 테스트는 자동화되어 개발 주기 내에서 즉시 피드백을 제공합니다.

---

## 2. 테스트 전략 (Testing Strategy)

### 2.1 테스트 피라미드 구조

```
        ╱  E2E  ╲        ← 적은 수, 높은 비용, 느린 실행
       ╱─────────╲
      ╱ Integration ╲    ← 중간 수, 중간 비용
     ╱───────────────╲
    ╱    Unit Tests    ╲  ← 많은 수, 낮은 비용, 빠른 실행
   ╱───────────────────╲
```

| 계층          | 비율  | 실행 시간   | 목적                                |
|---------------|-------|-------------|-------------------------------------|
| Unit          | 70%   | < 5ms/개    | 개별 함수/컴포넌트 로직 검증        |
| Integration   | 20%   | < 500ms/개  | 모듈 간 상호작용 및 API 검증        |
| E2E           | 10%   | < 10s/개    | 사용자 시나리오 종단 간 검증        |

### 2.2 테스트 원칙

- **FIRST 원칙**: Fast, Independent, Repeatable, Self-validating, Timely
- **Arrange-Act-Assert** 패턴 일관 적용
- **테스트 격리**: 각 테스트는 독립적인 환경에서 실행, 공유 상태 금지
- **결정적 테스트**: 동일 입력 → 동일 결과, 비결정적 요소는 Mock으로 제어

---

## 3. 테스트 도구 (Test Tools)

### 3.1 Unit & Integration 테스트 — Jest

```json
{
  "jest": {
    "testEnvironment": "node",
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/src/$1"
    },
    "setupFilesAfterSetup": ["<rootDir>/jest.setup.ts"],
    "coverageThreshold": {
      "global": { "branches": 80, "functions": 80, "lines": 80, "statements": 80 }
    }
  }
}
```

| 기능               | 설정                                             |
|--------------------|--------------------------------------------------|
| Test Runner        | Jest 29+                                         |
| TypeScript 지원    | `ts-jest` 프리셋                                 |
| 모의 프레임워크    | Jest 내장 `jest.fn()`, `jest.mock()`             |
| 커버리지           | Istanbul (Jest 내장), lcov + HTML 리포트         |
| 타이머 제어        | `jest.useFakeTimers()`                           |

### 3.2 E2E 테스트 — Playwright

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  baseURL: 'http://localhost:3000',
  use: {
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    colorScheme: 'light',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox',  use: { browserName: 'firefox' } },
    { name: 'mobile',   use: { browserName: 'chromium', viewport: { width: 375, height: 812 } } },
  ],
});
```

| 기능                | 설정                                              |
|---------------------|---------------------------------------------------|
| Browser Engine      | Playwright (Chromium, Firefox, WebKit)            |
| 자동 대기           | Auto-waiting 내장                                 |
| 네트워크 차단       | `route.intercept()`                               |
| 스크린샷/비디오     | 실패 시 자동 캡처                                 |
| 병렬 실행           | Worker 기반 병렬                                  |

---

## 4. Admin Dashboard 테스트 시나리오

### 4.1 인증/인가 시나리오

| 시나리오 ID | 설명                                      | 유형         |
|-------------|-------------------------------------------|--------------|
| AUTH-001    | 올바른 자격증명으로 로그인 성공           | Integration  |
| AUTH-002    | 잘못된 비밀번호 로그인 실패               | Integration  |
| AUTH-003    | 비활성 계정 로그인 차단                   | Integration  |
| AUTH-004    | 토큰 만료 시 자동 로그아웃                | E2E          |
| AUTH-005    | CSRF 토큰 누락 시 요청 거부               | Integration  |

### 4.2 대시보드 렌더링 시나리오

| 시나리오 ID | 설명                                      | 유형         |
|-------------|-------------------------------------------|--------------|
| DASH-001    | 통계 카드 4개 정상 렌더링                 | Unit         |
| DASH-002    | 최근 활동 목록 페이지네이션               | Integration  |
| DASH-003    | 알림 카운트 배지 실시간 업데이트          | Integration  |
| DASH-1M     | 10,000개 활동 로그 로딩 시 < 2초          | Performance  |

### 4.3 콘텐츠 관리 시나리오

| 시나리오 ID | 설명                                      | 유형         |
|-------------|-------------------------------------------|--------------|
| CMS-001     | 콘텐츠 생성 후 목록에 즉시 반영           | Integration  |
| CMS-002     | 콘텐츠 수정 시 버전 이력 자동 생성        | Integration  |
| CMS-003     | 콘텐츠 삭제 시 감사 로그 기록             | Integration  |
| CMS-004     | 카테고리별 필터링 동작                    | E2E          |

---

## 5. RBAC 테스트

### 5.1 역할별 권한 매트릭스

| 권한                | superadmin | admin | editor | viewer |
|---------------------|:----------:|:-----:|:------:|:------:|
| canManageUsers      | ✅         | ✅    | ❌     | ❌     |
| canManageContent    | ✅         | ✅    | ✅     | ❌     |
| canManageConfig     | ✅         | ✅    | ❌     | ❌     |
| canViewAudit        | ✅         | ✅    | ❌     | ❌     |
| canDeleteContent    | ✅         | ✅    | ❌     | ❌     |
| canManageAPIKeys    | ✅         | ❌    | ❌     | ❌     |
| canManageNotifications | ✅      | ✅    | ❌     | ❌     |
| canExportData       | ✅         | ✅    | ❌     | ❌     |
| canViewAnalytics    | ✅         | ✅    | ✅     | ✅     |

### 5.2 RBAC 테스트 케이스

```typescript
describe('RBAC 권한 검증', () => {
  const roles = ['superadmin', 'admin', 'editor', 'viewer'] as const;

  roles.forEach((role) => {
    describe(`역할: ${role}`, () => {
      it('권한 매트릭스에 따라 API 접근이 제어됨', async () => {
        const permissions = await getPermissions(role);
        const response = await request.withRole(role).get('/api/admin/users');
        expect(response.status).toBe(
          permissions.canManageUsers ? 200 : 403
        );
      });
    });
  });
});
```

- **RBAC-001**: 각 역할의 권한 매트릭스가 Permission 모델과 일치
- **RBAC-002**: 권한 없는 엔드포인트 접근 시 403 Forbidden 반환
- **RBAC-003**: 역할 변경 시 즉시 세션 권한 갱신
- **RBAC-004**: superadmin은 모든 권한 보유 (최상위 권한)

---

## 6. 접근성 테스트 (Accessibility — WCAG)

### 6.1 WCAG 2.1 AA 준수 검증

| 검증 항목                 | 도구                   | 기준                 |
|---------------------------|------------------------|----------------------|
| 색상 대비비               | `axe-core`             | 최소 4.5:1 (텍스트) |
| 키보드 내비게이션         | Playwright keyboard    | 모든 기능 접근 가능  |
| 스크린 리더 의미 구조     | `axe-core`             | ARIA 속성 완전성    |
| 폼 라벨 연결              | `axe-core`             | 모든 input에 label   |
| 포커스 표시               | 시각 검증 + Playwright | focus-visible 적용   |
| 터치 타겟 크기            | 커스텀 검증기          | 최소 44×44px        |

### 6.2 자동 접근성 테스트 설정

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

describe('접근성 검증', () => {
  it('AdminDashboard가 WCAG 2.1 AA를 준수함', async ({ page }) => {
    await page.goto('/admin');
    await injectAxe(page);
    await checkA11y(page, {
      tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      exclude: [['.third-party-widget']],
    });
  });
});
```

### 6.3 시니어 사용자 특화 검증

- 폰트 크기 배율 150% 적용 시 레이아웃 깨짐 없음
- 고대비 모드 전환 시 모든 텍스트 가독성 유지
- 음성 안내(TTS) 기능 동작 확인
- 큰 터치 타겟 모드 활성화 시 버튼 크기 확장

---

## 6.4 PWA 테스트 시나리오

### 6.4.1 서비스 워커 및 캐시

| 시나리오 ID | 설명 | 유형 |
|-------------|------|------|
| PWA-001 | 서비스 워커 등록 및 활성화 | E2E |
| PWA-002 | 4계층 캐시 (static, dynamic, images, API) 정상 동작 | E2E |
| PWA-003 | 오프라인 시 오프라인 페이지 표시 | E2E |
| PWA-004 | 온라인 복귀 시 캐시 자동 갱신 | Integration |
| PWA-005 | 백그라운드 동기 이벤트 처리 | Integration |
| PWA-006 | 푸시 알림 수신 및 표시 | E2E |
| PWA-007 | 설치 프롬프트(beforeinstallprompt) 정상 동작 | E2E |

### 6.4.2 PWA 매니페스트 검증

```typescript
// Playwright E2E 테스트
describe('PWA 매니페스트', () => {
  it('manifest.json이 유효함', async ({ page }) => {
    const manifest = await page.evaluate(async () => {
      const res = await fetch('/manifest.json');
      return res.json();
    });
    expect(manifest.name).toBeDefined();
    expect(manifest.shortcuts).toBeInstanceOf(Array);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });
});
```

---

## 6.5 Hydration 안전성 테스트 시나리오

| 시나리오 ID | 설명 | 유형 |
|-------------|------|------|
| HYD-001 | useClientValue SSR/CSR 값 일관성 | Unit |
| HYD-002 | useHydrated 초기값 false, hydration 후 true | Unit |
| HYD-003 | Radix UI Dialog ID mismatch 없음 | Integration |
| HYD-004 | Radix UI Popover ID mismatch 없음 | Integration |
| HYD-005 | 오프라인 표시기 hydration 안전 | E2E |
| HYD-006 | PWA 설치 배너 hydration 안전 | E2E |
| HYD-007 | 전체 페이지 hydration 경고 0건 | E2E |

---

## 7. 성능 테스트 (Performance Testing)

### 7.1 Core Web Vitals 목표

| 지표              | 목표치      | 측정 방법              |
|-------------------|-------------|------------------------|
| LCP               | < 2.5s      | Lighthouse / Playwright|
| FID               | < 100ms     | Lighthouse             |
| CLS               | < 0.1       | Lighthouse / Playwright|
| TTFB              | < 600ms     | Server 타이밍          |
| INP               | < 200ms     | Lighthouse 11+         |

### 7.2 부하 테스트 시나리오

| 시나리오              | 설명                                      | 도구           |
|-----------------------|-------------------------------------------|----------------|
| LOAD-001             | 100 동시 사용자 API 요청                  | k6 / Artillery |
| LOAD-002             | Admin 대시보드 50 동시 접속               | k6             |
| LOAD-003             | 채팅 메시지 200 req/s 지속 전송           | k6 WebSocket   |
| LOAD-004             | 이미지 변환 10 동시 업로드                | k6             |

### 7.3 메모리 누수 감지

- Playwright 테스트 종료 후 `page.metrics()` 기반 힙 메모리 비교
- 장시간 대시보드 유지 시 메모리 증가율 < 10MB/hour

---

## 8. CI/CD Pipeline

### 8.1 Pipeline 단계

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  Lint    │ → │  Unit    │ → │  Integ   │ → │  E2E     │ → │  Deploy  │
│  타입검사 │   │  테스트   │   │  테스트   │   │  테스트   │   │  스테이징 │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
```

### 8.2 단계별 상세

| 단계          | 명령                           | 실패 시 동작   | 타임아웃 |
|---------------|--------------------------------|----------------|----------|
| Lint          | `bun run lint`                 | 차단           | 2분      |
| Type Check    | `tsc --noEmit`                 | 차단           | 3분      |
| Unit Test     | `jest --coverage`              | 차단           | 5분      |
| Integration   | `jest --testPathPattern=integ` | 차단           | 10분     |
| E2E           | `playwright test`              | 차단           | 15분     |
| Lighthouse    | `lhci autorun`                 | 경고(비차단)   | 5분      |

### 8.3 병렬 실행 전략

- Unit 테스트: Jest `--shard` 옵션으로 4 Worker 분산
- E2E 테스트: Playwright `--workers=3` 로 3 Browser 병렬
- Integration 테스트: SQLite 인메모리 DB 인스턴스 격리

### 8.4 커버리지 게이트

```yaml
coverage_gate:
  statements: 80%
  branches: 80%
  functions: 80%
  lines: 80%
  fail_on_threshold_breach: true
```

### 8.5 알림 및 리포팅

- **성공 시**: 커버리지 리포트를 PR 코멘트에 자동 게시
- **실패 시**: Slack Webhook으로 팀에 즉시 알림
- **주간**: Lighthouse 성능 트렌드 리포트 자동 생성
- **아티팩트**: Playwright 트레이스, 스크린샷, 비디오 보존 (7일)
- **PWA**: Lighthouse PWA 감사 (Installable, Offline) 자동 검증
- **Hydration**: 빌드 시 hydration mismatch 경고 0건 확인

---

## 9. 테스트 환경 관리

### 9.1 환경 격리

| 환경          | DB                    | 외부 서비스     | 용도             |
|---------------|-----------------------|-----------------|------------------|
| Unit          | 인메모리 Mock         | 전체 Mock       | 로직 검증        |
| Integration   | SQLite 인메모리       | 선택적 Mock     | API 계약 검증    |
| E2E           | SQLite 파일 (tmp)    | 실제 서비스     | 사용자 흐름 검증 |

### 9.2 시드 데이터

- `prisma/seed.ts` 실행으로 기준 데이터 주입
- 테스트 전용 픽스처: `tests/fixtures/` 디렉토리
- Factory 패턴: `createAdminUser()`, `createContent()` 등 헬퍼 제공

---

## 10. 요약

Test Harness는 다층 테스트 전략(Unit → Integration → E2E)을 통해 전체 애플리케이션 품질을
보증합니다. Jest와 Playwright를 핵심 도구로 사용하며, RBAC, 접근성(WCAG), 성능(Core Web Vitals)
영역에 대한 전문 테스트 스위트를 포함합니다. CI/CD Pipeline과의 긴밀한 연동으로 모든 코드
변경이 자동 검증되어, 프로덕션 배포 시 높은 신뢰성을 보장합니다.
