import { defineConfig } from '@playwright/test';

/**
 * E2E 配置：跑在本地预览服务上（不依赖线上环境，避免把生产当测试环境）。
 * 首次使用需 `npx playwright install chromium`。
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4323',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4323',
    url: 'http://127.0.0.1:4323',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
