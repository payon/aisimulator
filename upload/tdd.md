# TDD: 테스트 주도 개발 가이드

## 1. 테스트 전략

### 1.1 테스트 피라미드
 E2E Tests (10%)
/              \
/ Integration
/ Tests (20%)
/
/ Unit Tests (70%) \

### 1.2 테스트 도구
| 도구 | 용도 |
|------|------|
| Jest | 유닛 테스트 |
| React Testing Library | 컴포넌트 테스트 |
| Cypress | E2E 테스트 |
| MSW (Mock Service Worker) | API 모킹 |
| Playwright | 크로스브라우징 테스트 |

## 2. 테스트 카테고리

### 2.1 Unit Tests (유닛 테스트)

#### 2.1.1 AI 채팅 모듈 테스트
```typescript
// __tests__/chat.service.test.ts
import { ChatService } from '@/services/chat.service';

describe('ChatService', () => {
  let chatService: ChatService;

  beforeEach(() => {
    chatService = new ChatService();
  });

  describe('sendMessage', () => {
    it('빈 메시지를 보내면 에러를 발생시킨다', async () => {
      await expect(chatService.sendMessage('')).rejects.toThrow('메시지는 비어있을 수 없습니다');
    });

    it('2000자 이상 메시지를 보내면 에러를 발생시킨다', async () => {
      const longMessage = 'a'.repeat(2001);
      await expect(chatService.sendMessage(longMessage)).rejects.toThrow('메시지는 2000자를 초과할 수 없습니다');
    });

    it('정상 메시지를 보내면 AI 응답을 받는다', async () => {
      const response = await chatService.sendMessage('안녕하세요');
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('timestamp');
    });
  });

  describe('sanitizeInput', () => {
    it('XSS 스크립트를 제거한다', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = chatService.sanitizeInput(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
    });
  });
});
// __tests__/image.service.test.ts
import { ImageService } from '@/services/image.service';

describe('ImageService', () => {
  let imageService: ImageService;

  beforeEach(() => {
    imageService = new ImageService();
  });

  describe('validateImage', () => {
    it('허용되지 않는 파일 형식을 거부한다', async () => {
      const file = new File([''], 'test.exe', { type: 'application/x-msdownload' });
      const result = await imageService.validateImage(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('허용되지 않는 파일 형식입니다');
    });

    it('10MB 초과 파일을 거부한다', async () => {
      const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const result = await imageService.validateImage(largeFile);
      expect(result.valid).toBe(false);
    });

    it('정상적인 JPG/PNG 파일을 허용한다', async () => {
      const file = new File([''], 'photo.jpg', { type: 'image/jpeg' });
      const result = await imageService.validateImage(file);
      expect(result.valid).toBe(true);
    });
  });

  describe('transformImage', () => {
    it('스타일 변환을 정상 수행한다', async () => {
      const result = await imageService.transformImage(mockFile, 'watercolor');
      expect(result).toHaveProperty('transformedImage');
      expect(result).toHaveProperty('processingTime');
    });
  });
});
// __tests__/api/chat.integration.test.ts
import { testClient } from '@/test/utils';

describe('Chat API Integration', () => {
  it('POST /api/chat - 정상 요청/응답', async () => {
    const response = await testClient.post('/api/chat').send({
      message: 'AI에 대해 알려주세요',
      sessionId: 'test-session',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('reply');
    expect(response.body).toHaveProperty('sessionId');
  });

  it('POST /api/chat - Rate Limiting 적용', async () => {
    // 60회 이상 요청 시 429 응답
    const requests = Array(65).fill(null).map(() =>
      testClient.post('/api/chat').send({ message: 'test', sessionId: 'rate-test' })
    );
    const responses = await Promise.allSettled(requests);
    const rateLimited = responses.filter(r => r.status === 'fulfilled' && r.value.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});

// cypress/e2e/senior-journey.cy.ts
describe('시니어 사용자 시나리오', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport('iphone-12'); // 모바일 우선
  });

  it('시니어가 AI 채팅을 체험할 수 있다', () => {
    // 큰 버튼 찾기
    cy.get('[data-testid="chat-feature-btn"]').should('be.visible').click();

    // 음성 입력 버튼이 존재하는지 확인
    cy.get('[data-testid="voice-input-btn"]').should('exist');

    // 메시지 입력
    cy.get('[data-testid="message-input"]').type('오늘 날씨가 어때?');

    // 전송 버튼 클릭 (크게 표시)
    cy.get('[data-testid="send-btn"]').click();

    // AI 응답 표시 확인
    cy.get('[data-testid="ai-response"]').should('be.visible');
  });

  it('시니어가 이미지를 업로드하여 변환할 수 있다', () => {
    cy.get('[data-testid="image-feature-btn"]').click();
    cy.get('[data-testid="file-upload"]').selectFile('fixtures/photo.jpg');
    cy.get('[data-testid="style-watercolor"]').click();
    cy.get('[data-testid="transform-btn"]').click();
    cy.get('[data-testid="result-image"]').should('be.visible');
  });
});

3. 테스트 커버리지 목표
카테고리
목표 커버리지
서비스 로직
90% 이상
UI 컴포넌트
80% 이상
API 엔드포인트
85% 이상
유틸리티 함수
95% 이상

4. CI/CD 파이프라인에서의 테스트
# .github/workflows/test.yml
name: Test Pipeline
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - run: npm run test:integration
      - run: npm run test:e2e
      - name: Coverage Check
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage below 80%"; exit 1;
          fi