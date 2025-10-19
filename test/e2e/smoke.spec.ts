import { test, expect } from '@playwright/test';

test('home loads', async ({ page }) => {
  await page.goto('/');
  // basic smoke: page is up and has some content
  await expect(page).toHaveTitle(/ClinicalAI Assistant/);
  // Wait for app to load instead of checking body visibility
  await page.waitForLoadState('networkidle');
  // Check for root element instead
  const root = page.locator('#root');
  await expect(root).toBeInViewport();
});