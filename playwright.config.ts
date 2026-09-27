import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3300',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  // 실행 전: docker compose up -d (PostgreSQL + 앱 기동 상태)
});
