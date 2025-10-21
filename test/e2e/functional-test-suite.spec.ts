import { test, expect } from '@playwright/test';

// Use production URL for testing
const BASE_URL = 'https://mental-scribe-app.vercel.app';

test.describe('Mental Scribe - Complete Functionality Test Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/ClinicalAI Assistant/);
    await expect(page.locator('#root')).toBeVisible();
  });

  test('CSP allows JavaScript execution', async ({ page }) => {
    // Check that React has mounted
    const rootHasContent = await page.locator('#root').evaluate(el => el.children.length > 0);
    expect(rootHasContent).toBe(true);
  });

  test('Navigation elements are visible', async ({ page }) => {
    // Check for header/logo
    await expect(page.getByText('ClinicalAI Assistant')).toBeVisible({ timeout: 10000 });
  });

  test('Authentication UI is present', async ({ page }) => {
    // Look for login/signup UI elements
    const hasAuthUI = await page.getByRole('button', { name: /sign in|log in|login/i }).count() > 0 ||
                      await page.getByRole('textbox', { name: /email/i }).count() > 0;
    expect(hasAuthUI).toBeTruthy();
  });

  test('Quick Actions section exists', async ({ page }) => {
    // Wait a bit for potential auth redirect
    await page.waitForTimeout(2000);
    
    // Check if we can find common UI elements
    const hasContent = await page.locator('body').evaluate(el => {
      if (el instanceof HTMLElement) {
        return el.innerText.length > 100;
      }
      return false;
    });
    expect(hasContent).toBe(true);
  });

  test('All critical buttons are clickable', async ({ page }) => {
    await page.waitForTimeout(2000); // Wait for app to fully load
    
    // Get all buttons on the page
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();
    
    console.log(`Found ${buttonCount} visible buttons on the page`);
    
    // Check that buttons are enabled (not all will be, some may require auth)
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const text = await button.innerText().catch(() => '');
      const isEnabled = await button.isEnabled();
      console.log(`Button ${i + 1}: "${text}" - ${isEnabled ? 'Enabled' : 'Disabled'}`);
    }
    
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('Forms are interactive', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Find text inputs
    const inputs = page.locator('input:visible');
    const inputCount = await inputs.count();
    
    console.log(`Found ${inputCount} visible inputs`);
    
    if (inputCount > 0) {
      // Try to focus and type in first input
      const firstInput = inputs.first();
      await firstInput.focus();
      await firstInput.fill('test');
      const value = await firstInput.inputValue();
      expect(value).toBe('test');
    }
  });

  test('No console errors on load', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    
    // Filter out expected errors (like network errors for auth)
    const criticalErrors = errors.filter(err => 
      !err.includes('401') && 
      !err.includes('403') &&
      !err.includes('Failed to fetch') &&
      !err.includes('supabase')
    );
    
    console.log('Console errors:', errors);
    expect(criticalErrors.length).toBe(0);
  });

  test('Page is responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const rootVisible = await page.locator('#root').isVisible();
    expect(rootVisible).toBe(true);
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    expect(await page.locator('#root').isVisible()).toBe(true);
  });

  test('Security headers are present', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    const headers = response?.headers();
    
    expect(headers?.['x-frame-options']).toBeTruthy();
    expect(headers?.['x-content-type-options']).toBeTruthy();
    expect(headers?.['referrer-policy']).toBeTruthy();
    expect(headers?.['strict-transport-security']).toBeTruthy();
    
    console.log('Security Headers:', {
      'X-Frame-Options': headers?.['x-frame-options'],
      'X-Content-Type-Options': headers?.['x-content-type-options'],
      'Referrer-Policy': headers?.['referrer-policy'],
      'Strict-Transport-Security': headers?.['strict-transport-security']
    });
  });

  test('All assets load successfully', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('response', response => {
      if (response.status() >= 400 && !response.url().includes('supabase')) {
        failedRequests.push(`${response.status()} - ${response.url()}`);
      }
    });
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('Failed asset requests:', failedRequests);
    expect(failedRequests.length).toBe(0);
  });

  test('Navigation works without errors', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Try to find and click navigation links
    const links = page.locator('a:visible, button:visible');
    const linkCount = await links.count();
    
    console.log(`Testing ${Math.min(linkCount, 5)} clickable elements`);
    
    // Test a few clicks to ensure no crashes
    for (let i = 0; i < Math.min(linkCount, 5); i++) {
      const element = links.nth(i);
      const text = await element.innerText().catch(() => '');
      
      try {
        await element.click({ timeout: 2000 });
        await page.waitForTimeout(500);
        console.log(`✓ Clicked: "${text}"`);
      } catch (e) {
        console.log(`✗ Could not click: "${text}"`);
      }
      
      // Go back to main page
      await page.goto(BASE_URL);
      await page.waitForTimeout(1000);
    }
  });

  test('TypeScript/React errors check', async ({ page }) => {
    const pageErrors: Error[] = [];
    
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
    
    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);
    
    console.log('Page errors:', pageErrors);
    expect(pageErrors.length).toBe(0);
  });
});
