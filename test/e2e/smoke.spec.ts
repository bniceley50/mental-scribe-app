import { test, expect } from '@playwright/test';

test('home loads', async ({ page }) => {
  await page.goto('/');
  // basic smoke: page is up and has some content
  await expect(page).toHaveTitle(/.+/);
  // try a common element; feel free to adjust to your app
  const body = page.locator('body');
  await expect(body).toBeVisible();
});