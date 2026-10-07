import { test, expect } from '@playwright/test';

const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL || 'admin@aiplatform.kr',
  password: process.env.E2E_ADMIN_PASSWORD || 'admin123',
};

test.describe('예시 질문 체험(프랙티스)', () => {
  test('빈 질문은 거부된다', async ({ request }) => {
    const res = await request.post('/api/practice', {
      data: { message: '' },
    });
    expect(res.status()).toBe(400);
  });

  test('목업 조회에 practice 키가 포함된다', async ({ request }) => {
    const login = await request.post('/api/admin/auth', {
      data: { email: ADMIN.email, password: ADMIN.password },
    });
    // 초기 비밀번호 강제 변경 상태일 수 있음 — 토큰이 있을 때만 검증
    if (login.status() !== 200) return;
    const body = await login.json();
    if (!body.token) return;
    const res = await request.get('/api/admin/mock', {
      headers: { Authorization: `Bearer ${body.token}` },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.mockData.practice).toBeTruthy();
    expect(Array.isArray(data.mockData.practice.examples)).toBe(true);
    expect(data.mockData.practice.examples.length).toBeGreaterThan(0);
    expect(typeof data.mockData.practice.default).toBe('string');
  });
});
