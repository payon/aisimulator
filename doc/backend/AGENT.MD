# AGENT.MD — AI Agent 통합 설계 문서

## AI Platform Backend Admin Dashboard

---

## 1. 개요

본 문서는 AI 플랫폼의 **Multi-Provider AI Agent 아키텍처**를 정의한다. 다수의 AI Provider를 통합하고, Fallback 체인을 통해 가용성을 보장하며, 시니어 사용자에게 최적화된 프롬프트를 관리하는 시스템이다.

### 1.1 설계 목표

| 목표 | 설명 |
|------|------|
| 가용성 | 단일 Provider 장애 시 자동 Fallback |
| 비용 최적화 | 작업 복잡도에 따른 Provider 선택 |
| 품질 보장 | 시니어 친화적 응답 생성 |
| 확장성 | 새로운 Provider 쉽게 추가 |
| 관측성 | 호출/에러/비용 추적 |

---

## 2. Multi-Provider 아키텍처

### 2.1 지원 Provider 목록

| Provider | 모델 | 용도 | 우선순위 | 상태 |
|----------|------|------|----------|------|
| z-ai-built-in | 기본 모델 | 범용 채팅, 이미지 생성 | 1 (최우선) | 활성 |
| OpenAI | GPT-4o, GPT-4o-mini | 고급 추론, 코드 생성 | 2 | 활성 |
| Gemini | Gemini 2.0 Flash | 빠른 응답, 멀티모달 | 3 | 활성 |
| Grok | Grok-3 | 실시간 정보, 창의적 응답 | 4 | 대기 |
| Claude | Claude 3.5 Sonnet | 긴 컨텍스트, 분석 | 5 | 대기 |

### 2.2 Provider 인터페이스

```typescript
interface AIProvider {
  name: string;                              // Provider 이름
  isAvailable(): Promise<boolean>;           // 가용성 확인
  chat(params: ChatParams): Promise<ChatResponse>;  // 채팅 요청
  generateImage?(params: ImageParams): Promise<ImageResponse>; // 이미지 생성
  getUsage?(): Promise<UsageInfo>;           // 사용량 조회
  healthCheck(): Promise<HealthStatus>;      // 상태 확인
}

interface ChatParams {
  messages: Message[];     // 대화 이력
  systemPrompt?: string;   // 시스템 프롬프트
  temperature?: number;    // 창의성 (0.0~1.0)
  maxTokens?: number;      // 최대 토큰 수
  userId: string;          // 사용자 ID (Rate Limit용)
}

interface ChatResponse {
  content: string;         // 응답 텍스트
  provider: string;        // 응답한 Provider
  tokensUsed: number;      // 사용 토큰 수
  latencyMs: number;       // 응답 시간 (ms)
}
```

### 2.3 Provider 레지스트리

```typescript
class ProviderRegistry {
  private providers: Map<string, AIProvider>;
  private config: ProviderConfig;

  // Provider 등록
  register(provider: AIProvider): void;

  // 가용한 Provider 목록 조회
  getAvailableProviders(): Promise<AIProvider[]>;

  // 우선순위 기반 Provider 선택
  selectProvider(task: TaskType): Promise<AIProvider>;

  // Provider 상태 모니터링
  monitorHealth(): void;
}
```

---

## 3. Provider 선택 로직 (Provider Selection Logic)

### 3.1 선택 기준

| 기준 | 가중치 | 설명 |
|------|--------|------|
| 우선순위 | 40% | 설정된 우선순위 순서 |
| 가용성 | 30% | 현재 응답 가능 여부 |
| 응답 시간 | 15% | 최근 평균 응답 시간 |
| 에러율 | 10% | 최근 5분 에러율 |
| 비용 | 5% | 토큰당 단가 |

### 3.2 작업별 Provider 매핑

| 작업 유형 | 기본 Provider | Fallback 순서 |
|-----------|---------------|---------------|
| 일반 채팅 | z-ai-built-in | → OpenAI → Gemini → Grok → Claude |
| 이미지 생성 | z-ai-built-in | → OpenAI (DALL-E) |
| 퀴즈 생성 | Gemini | → OpenAI → z-ai-built-in |
| 미래 자아 분석 | Claude | → OpenAI → Gemini |
| 콘텐츠 요약 | Gemini | → z-ai-built-in → OpenAI |
| 번역 | z-ai-built-in | → Gemini → OpenAI |

### 3.3 선택 알고리즘

```typescript
async function selectProvider(taskType: TaskType): Promise<AIProvider> {
  // 1. 작업에 매핑된 Provider 목록 조회
  const candidates = getMappedProviders(taskType);

  // 2. 가용성 필터링
  const available = await filterAvailable(candidates);

  // 3. Rate Limit 확인
  const withinLimit = filterByRateLimit(available);

  // 4. 종합 점수 계산
  const scored = withinLimit.map(p => ({
    provider: p,
    score: calculateScore(p, taskType),
  }));

  // 5. 최고 점수 Provider 선택
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.provider || throw new NoProviderAvailableError();
}
```

---

## 4. Fallback 체인 (Fallback Chain)

### 4.1 체인 구조

```
요청 → Primary Provider
         │ (성공) → 응답 반환
         │ (실패) → Fallback Provider 1
                    │ (성공) → 응답 반환
                    │ (실패) → Fallback Provider 2
                               │ (성공) → 응답 반환
                               │ (실패) → Fallback Provider 3
                                          │ (성공) → 응답 반환
                                          │ (실패) → 에러 반환
```

### 4.2 Fallback 트리거 조건

| 조건 | 코드 | Fallback 여부 |
|------|------|---------------|
| Provider 응답 불가 | ECONNREFUSED | 즉시 Fallback |
| 타임아웃 (30초) | ETIMEOUT | 즉시 Fallback |
| Rate Limit 초과 | 429 | 즉시 Fallback |
| 모델 과부하 | 503 | 즉시 Fallback |
| 인증 오류 | 401/403 | 즉시 Fallback |
| 콘텐츠 필터링 | 400 (content_policy) | 재시도 없이 에러 |
| 내부 서버 오류 | 500 | 1회 재시도 후 Fallback |
| 토큰 한계 초과 | 400 (context_length) | 더 큰 컨텍스트 Provider로 Fallback |

### 4.3 Fallback 실행 로직

```typescript
async function executeWithFallback(
  task: TaskType,
  params: ChatParams,
  chain: AIProvider[]
): Promise<ChatResponse> {
  const errors: Error[] = [];

  for (const provider of chain) {
    try {
      // Rate Limit 사전 확인
      if (!checkRateLimit(provider.name, params.userId)) {
        continue;
      }

      const response = await withTimeout(
        provider.chat(params),
        getTimeoutForProvider(provider.name)
      );

      // 성공 시 메트릭 기록
      recordSuccess(provider.name, response);
      return response;

    } catch (error) {
      errors.push(error);
      recordFailure(provider.name, error);

      // 재시도 불가 조건 확인
      if (isNonRetryable(error)) {
        throw new AIProviderError(error, provider.name);
      }

      continue; // 다음 Provider 시도
    }
  }

  throw new AllProvidersFailedError(errors);
}
```

---

## 5. 프롬프트 엔지니어링 (Prompt Engineering)

### 5.1 시스템 프롬프트 구조

```typescript
interface SystemPrompt {
  id: string;
  name: string;
  version: number;
  template: string;           // 프롬프트 템플릿
  variables: PromptVariable[]; // 동적 변수
  category: PromptCategory;    // 카테고리
}
```

### 5.2 공통 시스템 프롬프트 (시니어 특화)

```
당신은 시니어(60세 이상) 사용자를 돕는 친절한 AI 어시스턴트입니다.

## 응답 원칙
1. 한국어로 응답하세요 (전문 용어는 영어 병기)
2. 쉬운 언어를 사용하세요 (문장당 20자 이내 권장)
3. 단계별로 설명하세요 (번호 목록 활용)
4. 구체적인 예시를 제공하세요
5. 추상적 개념은 일상 비유로 설명하세요
6. 한 번에 하나의 주제만 다루세요
7. 긍정적이고 격려하는 톤을 유지하세요
8. 오해의 소지가 없는 정확한 정보를 제공하세요

## 금지 사항
- 전문 용어만 사용하지 마세요
- 긴 문단을 피하세요
- 부정적 표현을 최소화하세요
- 가정이나 추측을 사실처럼 말하지 마세요
```

### 5.3 작업별 프롬프트 템플릿

| 작업 | 프롬프트 특성 | Temperature |
|------|---------------|-------------|
| 일반 채팅 | 공통 + 대화 맥락 | 0.7 |
| 퀴즈 생성 | 공통 + 퀴즈 형식 지정 + 정답 검증 | 0.5 |
| 이미지 설명 | 공통 + 시각적 묘사 가이드 | 0.6 |
| 미래 자아 | 공통 + 심리 상담 톤 + 격려 | 0.8 |
| 콘텐츠 요약 | 공통 + 요약 형식 + 핵심 우선 | 0.3 |

### 5.4 프롬프트 버전 관리

| 버전 | 변경 내용 | 적용 일시 |
|------|-----------|-----------|
| v1.0 | 초기 프롬프트 | 2025-01-01 |
| v1.1 | 시니어 친화적 톤 강화 | 2025-01-15 |
| v1.2 | 금지 사항 추가 | 2025-02-01 |
| v1.3 | 작업별 Temperature 최적화 | 2025-02-15 |

---

## 6. Rate Limiting

### 6.1 제한 정책

| 대상 | 제한 | 윈도우 | 초과 시 동작 |
|------|------|--------|-------------|
| 일반 사용자 | 20회 | 1분 | 429 + Fallback |
| 인증된 사용자 | 60회 | 1분 | 429 + 대기 안내 |
| 관리자 | 200회 | 1분 | 429 + 경고 |
| IP 기준 | 100회 | 1분 | 429 + 차단 |

### 6.2 구현 (Token Bucket Algorithm)

```typescript
class RateLimiter {
  private buckets: Map<string, TokenBucket>;

  async checkLimit(key: string): Promise<RateLimitResult> {
    const bucket = this.getOrCreateBucket(key);
    const now = Date.now();

    // 토큰 리필
    const elapsed = now - bucket.lastRefill;
    const refill = Math.floor(elapsed / bucket.refillRate);
    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + refill);
    bucket.lastRefill = now;

    // 토큰 소비
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, remaining: bucket.tokens };
    }

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: (1 - bucket.tokens) * bucket.refillRate,
    };
  }
}
```

### 6.3 Rate Limit 헤더

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1700000000
```

---

## 7. 에러 처리 (Error Handling)

### 7.1 에러 분류

| 에러 유형 | 코드 | 사용자 메시지 | 복구 전략 |
|-----------|------|---------------|-----------|
| ProviderUnavailable | AI_001 | "잠시 서비스가 원활하지 않습니다. 다른 방법으로 도와드릴게요." | Fallback |
| RateLimitExceeded | AI_002 | "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." | 대기 |
| ContextTooLong | AI_003 | "대화 내용이 너무 깁니다. 새 대화를 시작해주세요." | 컨텍스트 축소 |
| ContentFiltered | AI_004 | "해당 내용은 처리할 수 없습니다. 다른 질문을 해주세요." | 재시도 불가 |
| AllProvidersFailed | AI_005 | "현재 AI 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해주세요." | 관리자 알림 |
| InvalidResponse | AI_006 | "응답을 생성하는 중 문제가 발생했습니다. 다시 시도해주세요." | 재시도 |

### 7.2 에러 로깅

```typescript
interface AIErrorLog {
  timestamp: string;
  provider: string;
  errorCode: string;
  errorMessage: string;
  userId: string;
  requestId: string;
  inputTokens: number;
  fallbackUsed: boolean;
  fallbackProvider?: string;
  resolutionTimeMs: number;
}
```

---

## 8. 세션 관리 (Session Management)

### 8.1 대화 세션 구조

```typescript
interface ChatSession {
  id: string;
  userId: string;
  provider: string;              // 현재 Provider
  messages: Message[];           // 대화 이력
  context: SessionContext;       // 세션 컨텍스트
  createdAt: string;
  updatedAt: string;
  totalTokens: number;           // 누적 토큰
  maxContextTokens: number;      // 최대 컨텍스트 (4096)
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider: string;              // 응답 Provider
  tokens: number;
  timestamp: string;
}
```

### 8.2 컨텍스트 윈도우 관리

| 전략 | 설명 | 기준 |
|------|------|------|
| 슬라이딩 윈도우 | 최근 N개 메시지 유지 | 토큰 수 < maxContextTokens |
| 요약 압축 | 오래된 메시지를 요약으로 대체 | 메시지 > 20개 |
| 중요도 기반 | 시스템 메시지 + 최근 10개 유지 | 항상 적용 |

### 8.3 세션 만료 정책

| 세션 유형 | 만료 시간 | 갱신 조건 |
|-----------|-----------|-----------|
| 활성 대화 | 30분 | 사용자 메시지 전송 시 |
| 유휴 대화 | 2시간 | 타임아웃 후 자동 종료 |
| 관리자 세션 | 8시간 | 활동 시 갱신 |
| 임시 세션 | 24시간 | 비인증 사용자 |

### 8.4 세션 지속성

- 대화 이력은 Database에 저장 (Prisma)
- 활성 세션은 메모리 캐시에 유지 (빠른 접근)
- 세션 복원 시 Database에서 로드 후 캐시에 적재
- 세션 종료 시 캐시에서 제거, DB에는 보존

---

## 9. 모니터링 & 관측성

### 9.1 메트릭

| 메트릭 | 단위 | 수집 주기 |
|--------|------|-----------|
| Provider별 응답 시간 | ms | 요청별 |
| Provider별 에러율 | % | 5분 윈도우 |
| 토큰 사용량 | tokens | 요청별 |
| Fallback 발생률 | % | 5분 윈도우 |
| 동시 세션 수 | count | 1분 |
| Rate Limit 초과율 | % | 5분 윈도우 |

### 9.2 관리자 Dashboard 표시

- Provider별 상태 표시灯 (🟢 활성 / 🟡 지연 / 🔴 장애)
- 실시간 응답 시간 그래프
- 일일 토큰 사용량 추이
- Fallback 발생 로그
- 비용 추정 (Provider별 단가 × 토큰)

---

## 10. PWA 푸시 알림 지원

### 10.1 푸시 알림 아키텍처

```
클라이언트                    서버
  │                             │
  │── requestPushPermission() ──→│
  │   (Notification.requestPermission())
  │                             │
  │── POST /api/pwa/subscribe ──→│
  │   { subscription }          │
  │                             │── DB에 구독 정보 저장
  │                             │
  │                   (관리자가 알림 발송)
  │                             │
  │                             │── POST /api/pwa/notify
  │                             │   → web push 전송
  │←── 푸시 이벤트 수신 ─────────│
  │── SW push 이벤트 핸들러     │
  │   → Notification 표시       │
  │── 알림 클릭 → URL 열기     │
```

### 10.2 Hydration 안전성

AI Agent 시스템에서 PWA 상태(isOnline, isInstalled 등)는 CSR 전용 값이므로 `useClientValue` 훅을 통해 SSR/CSR을 안전하게 분리합니다. 이를 통해:
- 서버 사이드 렌더링 시 기본값 사용
- 클라이언트 hydration 후 실제 PWA 상태 반영
- Radix UI `aria-controls` ID mismatch 방지
