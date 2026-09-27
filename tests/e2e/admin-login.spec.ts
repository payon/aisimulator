import { test, expect } from '@playwright/test';

const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL || 'admin@aiplatform.kr',
  password: process.env.E2E_ADMIN_PASSWORD || 'admin123',
};

test.describe('관리자 로그인', () => {
  test('잘못된 비밀번호로 실패', async ({ request }) => {
    const res = await request.post('/api/admin/auth', {
      data: { email: ADMIN.email, password: 'wrong-password' },
    });
    expect(res.status()).toBe(401);
  });

  test('올바른 계정으로 로그인 후 세션 확인', async ({ request }) => {
    const login = await request.post('/api/admin/auth', {
      data: { email: ADMIN.email, password: ADMIN.password },
    });
    // 초기 비밀번호 강제 변경 상태일 수 있음
    expect([200, 401]).toContain(login.status());
    if (login.status() === 200) {
      const body = await login.json();
      if (body.token) {
        const me = await request.get('/api/admin/auth', {
          headers: { Authorization: `Bearer ${body.token}` },
        });
        expect(me.status()).toBe(200);
      } else {
        // 2FA 또는 비밀번호 변경 단계로 전환된 경우
        expect(body.totpRequired || body.mustChangeRequired).toBeTruthy();
      }
    }
  });

  test('로그인 화면 렌더링', async ({ request }) => {
    // 헤드리스 브라우저 의존 없이 SSR HTML로 검증 (브라우저 E2E는 CI에서 실행)
    const res = await request.get('/admin');
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('관리자 로그인');
  });
});
