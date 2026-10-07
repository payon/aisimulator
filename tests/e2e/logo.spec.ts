import { test, expect } from '@playwright/test';

test.describe('화면별 로고 API', () => {
  test('인증 없이 조회 불가', async ({ request }) => {
    const res = await request.get('/api/admin/logo');
    expect(res.status()).toBe(401);
  });

  test('인증 없이 업로드 불가', async ({ request }) => {
    const res = await request.post('/api/admin/logo', {
      multipart: { name: 'logo-mobile.png' },
    });
    expect(res.status()).toBe(401);
  });

  test('인증 없이 삭제 불가', async ({ request }) => {
    const res = await request.delete('/api/admin/logo?name=logo-mobile.png');
    expect(res.status()).toBe(401);
  });
});
