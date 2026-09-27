# Test-Driven Development 전략 (TDD)

## 1. 개요

본 문서는 AI 플랫폼 개발에 적용할 Test-Driven Development(TDD) 전략을 정의합니다.
TDD는 "테스트 먼저 작성 → 코드 구현 → 리팩터링"의 순환(Red-Green-Refactor)을 통해
요구사항을 정확히 반영하는 코드를 생산합니다. 모든 백엔드 모듈과 프론트엔드 컴포넌트는
TDD 사이클을 거쳐 개발됩니다.

---

## 2. TDD 워크플로우

### 2.1 Red-Green-Refactor 사이클

```
  ┌─────────────────────────────────────────────┐
  │                                             │
  │   ① RED: 실패하는 테스트를 먼저 작성       │
  │       ↓                                     │
  │   ② GREEN: 테스트를 통과하는 최소 코드 작성 │
  │       ↓                                     │
  │   ③ REFACTOR: 중복 제거, 구조 개선          │
  │       ↓                                     │
  │   → ① 로 순환 (다음 요구사항)               │
  │                                             │
  └─────────────────────────────────────────────┘
```

### 2.2 사이클 시간 가이드라인

| 단계       | 목표 시간 | 최대 시간 | 비고                          |
|------------#|-----------|-----------|-------------------------------|
| Red        | 2분       | 5분       | 테스트 의도가 명�B해야 함     |
| Green      | 3분       | 10분      | 최소 구현'만' 작성'          A   |
| Refactor   | 5분       | 15분      | 설계 품질: 향상 목적         7     |

### 2.3 TDD 원칙

1. **테스트 우선**: 프로덕션 코드는 오직 실패하는 테스트를 통과시키기 위해 작성
2. **최소 구현**: Green 단계에서는 테스트를 통과하는 최소한의 코드만 작성
3. **작은 단위**: 한 번에 하나의 동작/요구사항만 검증
4. **빠른 피드백**: 전체 사이클을 10분 이내로 유지
5. **지속적 리팩터링**: Green 이후 반드시 리팩터링 단계 수행

---

## 3. 테스트 피라미드 (Test Pyramid)

### 3.1 계층별 책임

```
              ▲
             ╱ ╲        E2E (10%)
            ╱   ╲       - 핵심 사용자 흐름
           ╱─────╲      - 크로스 브라우저
          ╱       ╲     Integration (20%)
         ╱         ╲    - API 라우트
        ╱───────────╲   - DB 상호작용
       ╱             ╲  Unit (70%)
      ╱───────────────╲ - 순수 함수
     ╱                 ╲- 컴포넌트
    ╱───────────────────╲- Zustand Store
```

### 3.2 계층별 커버리지 목표

| 계층        | 커버리지 목표 | 파일 위치              | 실행 명령                    |
|-------------|:------------:|------------------------|------------------------------|
| Unit        | ≥ 90%        | `__tests__/unit/`      | `jest --testPathPattern=unit`|
| Integration | ≥ 80%        | `__tests__/integ/`     | `jest --testPathPattern=integ`|
| E2E         | ≥ 70%        | `e2e/`                 | `playwright test`            |

---

## 4. 커버리지 목표 (Coverage Targets)

### 4.1 전역 목표

| 지표        | 목표   | 최소   | 설명                           |
|-------------|--------|--------|--------------------------------|
| Statements  | 85%    | 80%    | 실행 가능한 문장 커버리지      |
| Branches    | 80%    | 75%    | 분기(if/switch) 커버리지       |
| Functions   | 90%    | 85%    | 함수 정의 커버리지             |
| Lines       | 85%    | 80%    | 실행 라인 커버리지             |

### 4.2 모듈별 목표

| 모듈               | 목표   | 우선순위 | 비고                        |
|--------------------|--------|----------|-----------------------------|
| `lib/admin-auth`   | 95%    | P0       | 인증 로직은 최고 품질      |
| `lib/audit`        | 90%    | P0       | 감사 추적 완전성 보장      |
| `lib/security`     | 95%    | P0       | 보안 유틸리티              |
| `lib/rate-limit`   | 90%    | P1       | Rate limiting 정확성       |
| `lib/ai-provider`  | 85%    | P1       | AI Provider 추상화         |
| `stores/*`         | 85%    | P1       | 상태 관리 로직             |
| `api/admin/*`      | 80%    | P2       | API 라우트                 |
| `components/*`     | 75%    | P2       | UI 컴포넌트                |
| `hooks/use-hydrated`| 95%   | P0       | Hydration 안전성 훅        |
| `hooks/use-pwa`     | 90%    | P0       | PWA 기능 훅               |
| `hooks/use-mock-mode`| 85%  | P1       | Mock 모드 훅               |

---

## 5. Mock 전략 — AI Provider

### 5.1 Mock 계층 구조

```
  실제 요청
      ↓
  AI Provider 인터페이스 (추상화)
      ↓
  ┌─────────────────────────────┐
  │  Mock Provider (테스트용)   │
  │  - 결정적 응답 반환         │
  │  - 지연 시뮬레이션          │
  │  - 에러 시나리오 재현       │
  └─────────────────────────────┘
```

### 5.2 Mock 구현 패턴

```typescript
// 테스트용 Mock AI Provider
const mockAiProvider = {
  chat: jest.fn().mockResolvedValue({
    content: '테스트 응답',
    usage: { tokens: 100 },
  }),
  imageTransform: jest.fn().mockResolvedValue({
    imageUrl: 'https://mock.test/image.png',
  }),
  futureSelf: jest.fn().mockResolvedValue({
    imageUrl: 'https://mock.test/future.png',
  }),
};

// 에러 시나리오 Mock
const mockAiProviderError = {
  chat: jest.fn().mockRejectedValue(new Error('API rate limit exceeded')),
};
```

### 5.3 Mock 시나리오 매트릭스

| 시나리오            | Mock 동작                              | 검증 대상                    |
|---------------------|----------------------------------------|------------------------------|
| 정상 응답           | 200 OK + 유효 데이터 반환              | 데이터 파싱 로직            |
| Rate Limit          | 429 Error                              | 재시도/백오프 로직           |
| 네트워크 오류       | ECONNRESET                             | 에러 핸들링 & 사용자 메시지  |
| 타임아웃            | 504 Gateway Timeout                    | 타임아웃 폴백                |
| 빈 응답             | 200 OK + 빈 본문                      | 엣지 케이스 처리             |
| 스트리밍 응답       | ReadableStream 시뮬레이션              | 스트리밍 파서                |

---

## 6. Database 테스트 — SQLite

### 6.1 인메모리 SQLite 전략

```typescript
// jest.setup.ts
import { PrismaClient } from '@prisma/client';

beforeAll(async () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: 'file::memory:?cache=shared' } },
  });
  await prisma.$connect();
  // 스키마 적용
  await prisma.$executeRawUnsafe(await fs.readFileSync('prisma/migrations.sql', 'utf-8'));
  global.__PRISMA__ = prisma;
});

afterAll(async () => {
  await global.__PRISMA__.$disconnect();
});
```

### 6.2 트랜잭션 기반 테스트 격리

```typescript
describe('콘텐츠 관리', () => {
  let tx: PrismaTransaction;

  beforeEach(async () => {
    tx = await prisma.$transaction([]);
  });

  afterEach(async () => {
    await tx.$rollback(); // SQLite는 중첩 트랜잭션 지원 안함 → 대안 사용
  });

  it('콘텐츠 생성 시 ContentVersion이 자동 생성됨', async () => {
    const content = await tx.content.create({ data: { key: 'test', value: 'hello' } });
    const versions = await tx.contentVersion.findMany({ where: { contentId: content.id } });
    expect(versions).toHaveLength(1);
  });
});
```

### 6.3 SQLite 특성 고려사항

| 항목              | SQLite 동작             | 테스트 대응                        |
|-------------------|-------------------------|------------------------------------|
| 직렬화            | 단일 Writer             | 테스트 병렬 시 DB 분리            |
| BOOLEAN           | INTEGER 0/1             | `true`/`false` 매핑 검증           |
| DateTime          | TEXT (ISO 문자열)       | Prisma가 자동 처리, 비교 로직 주의|
| JSON              | TEXT                    | `Json()` 필드 파싱 검증            |
| CASCADE 삭제      | PRAGMA 필요             | `foreign_keys=ON` 설정             |

---

## 7. API Route 테스트 패턴

### 7.1 Next.js App Router API 테스트

```typescript
import { POST } from '@/app/api/admin/auth/route';
import { NextRequest } from 'next/server';

describe('POST /api/admin/auth', () => {
  it('유효한 자격증명으로 JWT 토큰 반환', async () => {
    const request = new NextRequest('http://localhost/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@test.com', password: 'valid' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.token).toBeDefined();
    expect(data.user.role).toBe('admin');
  });

  it('잘못된 비밀번호 시 401 반환', async () => {
    const request = new NextRequest('http://localhost/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@test.com', password: 'wrong' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
```

### 7.2 API 테스트 체크리스트

| 검증 항목         | 설명                                    | 상태 코드 |
|-------------------|-----------------------------------------|-----------|
| 성공 응답         | 올바른 데이터 구조 반환                 | 200       |
| 생성 성공         | 리소스 생성 후 위치 반환                | 201       |
| 유효성 오류       | 입력 검증 실패                          | 400       |
| 인증 오류         | 토큰 누락/만료                          | 401       |
| 권한 오류         | RBAC 위반                               | 403       |
| 미존재 리소스     | 대상 리소스 없음                        | 404       |
| Rate Limit        | 요청 한도 초과                          | 429       |
| 서버 오류         | 예외 처리 실패                          | 500       |

---

## 8. 컴포넌트 테스트 패턴

### 8.1 React 컴포넌트 테스트

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

describe('AdminDashboard', () => {
  it('통계 카드 4개가 렌더링됨', () => {
    render(<AdminDashboard />);
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(4);
  });

  it('새로고침 버튼 클릭 시 데이터 재조회', async () => {
    render(<AdminDashboard />);
    const refreshBtn = screen.getByRole('button', { name: /새로고침/i });
    fireEvent.click(refreshBtn);
    expect(await screen.findByText(/로딩/i)).toBeInTheDocument();
  });
});
```

### 8.2 Zustand Store 테스트

```typescript
import { useAdminStore } from '@/stores/admin-store';

describe('AdminStore', () => {
  beforeEach(() => {
    useAdminStore.setState({ isAuthenticated: false, token: null, user: null });
  });

  it('login 액션이 인증 상태를 갱신함', () => {
    const { login } = useAdminStore.getState();
    login('mock-token', { id: '1', email: 'a@b.com', name: 'Admin', role: 'admin' });

    const state = useAdminStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('mock-token');
    expect(state.user?.role).toBe('admin');
  });

  it('logout 액션이 상태를 초기화함', () => {
    const { login, logout } = useAdminStore.getState();
    login('token', { id: '1', email: 'a@b.com', name: 'A', role: 'admin' });
    logout();

    const state = useAdminStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
  });
});
```

---

## 8.3 PWA 테스트 전략

### 8.3.1 서비스 워커 테스트

```typescript
import { register, getRegistration } from '@/hooks/use-pwa';

describe('서비스 워커', () => {
  it('SW가 등록되어 있음', async () => {
    const reg = await getRegistration();
    expect(reg).toBeDefined();
    expect(reg.active).toBeDefined();
  });

  it('4개 캐시 계층이 생성됨', async () => {
    const caches = await window.caches.keys();
    expect(caches).toContain('static-cache');
    expect(caches).toContain('dynamic-cache');
    expect(caches).toContain('images-cache');
    expect(caches).toContain('api-cache');
  });

  it('오프라인 페이지가 캐시됨', async () => {
    const cache = await window.caches.open('static-cache');
    const response = await cache.match('/offline.html');
    expect(response).toBeDefined();
  });
});
```

### 8.3.2 푸시 알림 테스트

| 시나리오 | 검증 항목 | 유형 |
|----------|-----------|------|
| 푸시 구독 | /api/pwa/subscribe 호출, VAPID 키 적용 | Integration |
| 푸시 수신 | SW push 이벤트 처리, 알림 표시 | E2E |
| 알림 클릭 | 클라이언트 포커스, URL 열기 | E2E |
| 백그라운드 동기 | sync 이벤트, 오프라인 큐 처리 | Integration |

### 8.3.3 설치 프롬프트 테스트

```typescript
describe('PWAInstallBanner', () => {
  it('beforeinstallprompt 이벤트 시 배너 표시', () => {
    render(<PWAInstallBanner />);
    fireEvent(window, new Event('beforeinstallprompt'));
    expect(screen.getByText(/앱으로 설치/i)).toBeInTheDocument();
  });

  it('설치 클릭 시 prompt() 호출', async () => {
    const mockPrompt = jest.fn();
    render(<PWAInstallBanner />);
    // ... 설치 버튼 클릭
    expect(mockPrompt).toHaveBeenCalled();
  });
});
```

---

## 8.4 Hydration 안전성 테스트

### 8.4.1 useClientValue 테스트

```typescript
import { renderHook } from '@testing-library/react';
import { useClientValue, useHydrated } from '@/hooks/use-hydrated';

describe('useClientValue', () => {
  it('SSR에서 serverValue 반환', () => {
    const { result } = renderHook(() =>
      useClientValue('server-default', () => 'client-value')
    );
    // SSR 환경에서는 serverValue
    expect(result.current).toBe('server-default');
  });

  it('Hydration 후 clientValue 반환', () => {
    const { result } = renderHook(() =>
      useClientValue('server-default', () => 'client-value')
    );
    // 클라이언트 hydration 완료 후
    expect(result.current).toBe('client-value');
  });

  it('hydration mismatch 발생하지 않음', () => {
    // useSyncExternalStore 사용으로 SSR/CSR 일관성 보장
    const consoleError = jest.spyOn(console, 'error');
    renderHook(() => useClientValue(null, () => window.innerWidth));
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('hydration')
    );
  });
});

describe('useHydrated', () => {
  it('초기값 false, hydration 후 true', () => {
    const { result } = renderHook(() => useHydrated());
    expect(result.current).toBe(false);
    // hydration 완료
    expect(result.current).toBe(true);
  });
});
```

### 8.4.2 Radix UI 호환성 테스트

| 컴포넌트 | 검증 항목 | 방법 |
|----------|-----------|------|
| Dialog | aria-controls ID 일치 | SSR 렌더 + hydration |
| Popover | trigger/content ID 연결 | useClientValue 적용 확인 |
| DropdownMenu | menu ID 안전 생성 | hydration mismatch 없음 |
| Tabs | tab/panel ID 연결 | SSR/CSR 동일성 검증 |

---

| 원칙                 | 설명                                         |
|----------------------|----------------------------------------------|
| 사용자 관점 테스트   | 내부 구현이 아닌 사용자가 보는 동작을 검증   |
| 역할 기반 쿼리       | `getByRole`, `getByLabelText` 우선 사용      |
| 비동기 처리          | `findBy*` 로 비동기 상태 변화 대기            |
| Mock 최소화          | 자식 컴포넌트는 Mock하지 않고 통합 테스트    |
| 시각적 회귀          | 중요 컴포넌트에 스크린샷 테스트 추가 검토    |

---

## 9. TDD 적용 프로세스 요약

1. **요구사항 분해**: 기능 요구사항을 테스트 가능한 단위로 분할
2. **Red**: 실패 테스트 작성 — 요구사항의 기대 동작을 명세
3. **Green**: 최소 구현 — 테스트를 통과하는 가장 간단한 코드
4. **Refactor**: 설계 개선 — 중복 제거, 패턴 적용, 가독성 향상
5. **커버리지 확인**: 목표 이하 시 누락 케이스 보완
6. **PR 리뷰**: 테스트 코드와 프로덕션 코드를 함께 검토
7. **CI 검증**: Pipeline에서 자동 실행, 실패 시 머지 차단
8. **PWA 검증**: 서비스 워커 등록, 캐시 전략, 오프라인 동작 검증
9. **Hydration 검증**: useClientValue/useHydrated 훅, SSR/CSR 일관성 검증
