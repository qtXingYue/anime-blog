import { test, expect } from '@playwright/test';

// 开屏遮罩会挡住点击，测试环境直接标记「已看过」
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('qtx:splash-v1', '1');
    } catch (_) {
      /* ignore */
    }
  });
});

test('首页正常渲染且标题正确', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/QT新月/);
  await expect(page.locator('h1').first()).toContainText('新月');
  // 关键区块存在
  await expect(page.locator('#projects')).toBeVisible();
});

test('主题切换可往返，刷新后保持', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const toggle = page.locator('[data-theme-toggle]').first();

  await expect(toggle).toBeVisible();
  await html.evaluate((el) => el.setAttribute('data-theme', 'dark'));

  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'light');

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');
});

test('站内跳转后主题不丢失且开关仍可用', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const toggle = page.locator('[data-theme-toggle]').first();

  await html.evaluate((el) => el.setAttribute('data-theme', 'dark'));
  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'light');

  await page.goto('/blog.html');
  await expect(html).toHaveAttribute('data-theme', 'light');

  await page.locator('[data-theme-toggle]').first().click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
});

test('架构报告页包含最新章节', async ({ page }) => {
  await page.goto('/projects/portfolio-report.html');
  await expect(page.locator('body')).toContainText('Cloudflare 边缘网络');
  await expect(page.locator('body')).toContainText('黑金开屏加载动画');
  await expect(page.locator('body')).toContainText('23 端点');
});
