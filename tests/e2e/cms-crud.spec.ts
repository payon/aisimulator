import { test, expect } from '@playwright/test';

const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL || 'admin@aiplatform.kr',
  password: process.env.E2E_ADMIN_PASSWORD || 'admin123',
};

test.describe('CMS 콘텐츠 CRUD + XSS 가드', () => {
  let token = '';

  test.beforeAll(async ({ request }) => {
    const login = await request.post('/api/admin/auth', {
      data: { email: ADMIN.email, password: ADMIN.password },
    });
    expect(login.status()).toBe(200);
    const body = await login.json();
    expect(body.token).toBeTruthy();
    token = body.token;
  });

  test('악성 키·XSS 값 거부', async ({ request }) => {
    const auth = { Authorization: `Bearer ${token}` };
    const badKey = await request.post('/api/admin/content', {
      headers: auth,
      data: { key: 'bad key!!', category: 'home', type: 'text', value: 'x' },
    });
    expect(badKey.status()).toBe(400);

    const xss = await request.post('/api/admin/content', {
      headers: auth,
      data: { key: 'test.e2e.probe', category: 'home', type: 'text', value: '<script>alert(1)</script>' },
    });
    expect(xss.status()).toBe(400);
  });

  test('생성 → 버전 기록 → 롤백 → 삭제', async ({ request }) => {
    const auth = { Authorization: `Bearer ${token}` };
    const key = `test.e2e.${Date.now()}`;

    const created = await request.post('/api/admin/content', {
      headers: auth,
      data: { key, category: 'home', type: 'text', value: 'v1' },
    });
    expect(created.status()).toBe(201);
    const item = (await created.json()).item;

    for (const v of ['v2', 'v3']) {
      const updated = await request.put('/api/admin/content', {
        headers: auth,
        data: { id: item.id, value: v },
      });
      expect(updated.status()).toBe(200);
    }

    const versions = await request.get(`/api/admin/content/versions?contentId=${item.id}`, { headers: auth });
    expect(versions.status()).toBe(200);
    const vlist = (await versions.json()).versions;
    expect(vlist.length).toBeGreaterThanOrEqual(2);

    // 오래된 버전(값 v2 상태)으로 복원
    const rollback = await request.post('/api/admin/content/rollback', {
      headers: auth,
      data: { versionId: vlist[1].id },
    });
    expect(rollback.status()).toBe(200);
    expect((await rollback.json()).item.value).toBe('v2');

    const del = await request.delete(`/api/admin/content?id=${item.id}`, { headers: auth });
    expect(del.status()).toBe(200);
  });
});
