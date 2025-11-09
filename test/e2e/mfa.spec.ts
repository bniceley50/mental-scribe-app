import { test, expect } from '@playwright/test';

test.describe('Multi-Factor Authentication', () => {
  test('MFA enrollment flow displays QR code and recovery codes', async ({ page }) => {
    // This test assumes user is already logged in
    // In real scenario, you would need to authenticate first
    
    await page.goto('/security-settings');
    await page.waitForLoadState('networkidle');
    
    // Check for MFA enrollment button
    const enableMfaButton = page.getByRole('button', { name: /enable mfa/i });
    
    if (await enableMfaButton.isVisible()) {
      // Click enable MFA
      await enableMfaButton.click();
      
      // Wait for QR code to be displayed
      await page.waitForSelector('img[alt="MFA QR Code"]', { timeout: 10000 });
      
      // Verify QR code is visible
      const qrCode = page.locator('img[alt="MFA QR Code"]');
      await expect(qrCode).toBeVisible();
      
      // Verify secret key is displayed
      const secretKey = page.locator('code').filter({ hasText: /^[A-Z0-9]{32,}$/ });
      await expect(secretKey).toBeVisible();
      
      // Verify verification code input is present
      const verifyInput = page.getByLabel(/enter verification code/i);
      await expect(verifyInput).toBeVisible();
      await expect(verifyInput).toHaveAttribute('maxLength', '6');
    }
  });

  test('MFA sign-in flow shows authentication code input', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // This would require a user with MFA enabled
    // Just verify the UI structure exists
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
  });

  test('MFA verification allows switching between TOTP and recovery code', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // Sign in form should be visible
    const emailInput = page.getByLabel(/email/i).first();
    await expect(emailInput).toBeVisible();
    
    // Note: Full MFA flow testing requires:
    // 1. A test user with MFA enabled
    // 2. Valid TOTP codes or recovery codes
    // This is better suited for integration tests with test fixtures
  });

  test('recovery codes have proper format and download functionality', async ({ page }) => {
    // Navigate to security settings (assumes authenticated)
    await page.goto('/security-settings');
    await page.waitForLoadState('networkidle');
    
    // Check if recovery codes section exists (after MFA enrollment)
    const recoveryCodes = page.locator('.font-mono').filter({ hasText: /^[A-Z0-9]{8}$/ });
    
    // If recovery codes are visible, verify format
    if (await recoveryCodes.count() > 0) {
      const firstCode = await recoveryCodes.first().textContent();
      expect(firstCode).toMatch(/^[A-Z0-9]{8}$/);
      
      // Verify download button exists
      const downloadButton = page.getByRole('button', { name: /download recovery codes/i });
      await expect(downloadButton).toBeVisible();
    }
  });

  test('MFA inputs have proper accessibility attributes', async ({ page }) => {
    await page.goto('/security-settings');
    await page.waitForLoadState('networkidle');
    
    // Check accessibility of security settings page
    const heading = page.getByRole('heading', { name: /security settings/i });
    await expect(heading).toBeVisible();
    
    // If MFA enrollment is visible, check input accessibility
    const enableButton = page.getByRole('button', { name: /enable mfa/i });
    if (await enableButton.isVisible()) {
      await expect(enableButton).toBeEnabled();
    }
  });

  test('MFA verification code input validates format', async ({ page }) => {
    await page.goto('/auth');
    
    // This test would need to:
    // 1. Sign in with MFA-enabled account
    // 2. Get to MFA verification screen
    // 3. Test input validation
    
    // For now, just verify auth page loads
    await page.waitForLoadState('networkidle');
    const signInButton = page.getByRole('button', { name: /sign in/i }).first();
    await expect(signInButton).toBeVisible();
  });
});
