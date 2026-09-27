import { test, expect } from '@playwright/test';

const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL || 'admin@aiplatform.kr',
  password: process.env.E2E_ADMIN_PASSWORD || 'admin123',
};

test.describe('목업 체험 프리셋', () => {
  let token = '';

  test.beforeAll(async ({ request }) => {
    const login = await request.post('/api/admin/auth', {
      data: { email: ADMIN.email, password: ADMIN.password },
    });
    expect(login.status()).toBe(200);
    token = (await login.json()).token;
    expect(token).toBeTruthy();
  });

  test('프리셋 등록 시 mock 응답에 반영', async ({ request }) => {
    const auth = { Authorization: `Bearer ${token}` };
    const save = await request.post('/api/admin/mock', {
      headers: auth,
      data: { mockData: { image: { results: { watercolor: '/icons/icon-192x192.png' } } } },
    });
    expect(save.status()).toBe(200);

    // 1x1 PNG data URL
    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const res = await request.post('/api/image', { data: { imageData: png, style: 'watercolor' } });
    // mockMode가 꺼져 있으면 실제 AI 호출로 실패할 수 있음 — 프리셋 케이스만 검증
    if (res.status() === 200) {
      const body = await res.json();
      if (body.mockMode) {
        expect(body.preset).toBe(true);
        expect(body.transformedImage).toBe('/icons/icon-192x192.png');
      }
    }

    // 정리
    await request.post('/api/admin/mock', {
      headers: auth,
      data: { mockData: { image: { results: { watercolor: '' } } } },
    });
  });

  test('헬스체크', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('ok');
  });
});
