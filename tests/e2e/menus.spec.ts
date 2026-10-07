import { test, expect } from '@playwright/test';

test.describe('메뉴 관리 API', () => {
  test('인증 없이 조회 불가', async ({ request }) => {
    const res = await request.get('/api/admin/menus');
    expect(res.status()).toBe(401);
  });

  test('인증 없이 저장 불가', async ({ request }) => {
    const res = await request.post('/api/admin/menus', {
      data: { order: ['home'], hidden: [], labels: {} },
    });
    expect(res.status()).toBe(401);
  });

  test('인증 없이 초기화 불가', async ({ request }) => {
    const res = await request.delete('/api/admin/menus');
    expect(res.status()).toBe(401);
  });
});
