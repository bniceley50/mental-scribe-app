import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('displays login form on auth page', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // Check for email and password inputs
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    
    // Verify inputs have proper autocomplete attributes
    await expect(emailInput).toHaveAttribute('autocomplete', 'email');
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    
    // Verify no autocapitalize or spellcheck on email
    await expect(emailInput).toHaveAttribute('autocapitalize', 'none');
    await expect(emailInput).toHaveAttribute('spellcheck', 'false');
  });

  test('shows error message for invalid credentials', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    
    // Submit form
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await signInButton.click();
    
    // Wait for and verify error toast or message
    // Note: This assumes toast notifications are used for errors
    await page.waitForSelector('[role="status"]', { timeout: 5000 });
  });

  test('password reset link is keyboard accessible', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // Find forgot password link
    const forgotPasswordLink = page.getByText(/forgot.*password/i);
    
    if (await forgotPasswordLink.isVisible()) {
      // Tab to the link
      await forgotPasswordLink.focus();
      await expect(forgotPasswordLink).toBeFocused();
      
      // Verify it's keyboard activatable
      await forgotPasswordLink.press('Enter');
      
      // Should show password reset UI
      await expect(page.getByText(/reset.*password/i)).toBeVisible();
    }
  });

  test('form labels are properly associated with inputs', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // Check email input has associated label
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveAttribute('type', 'email');
    
    // Check password input has associated label
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('complete signup flow and session persistence', async ({ page, context }) => {
    // Generate unique test user
    const timestamp = Date.now();
    const testEmail = `test-user-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';

    // Navigate to auth page
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    // Switch to Sign Up tab
    const signUpTab = page.getByRole('tab', { name: /sign up/i });
    await signUpTab.click();
    await page.waitForTimeout(500);

    // Fill in signup form
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);

    // Submit signup
    const signUpButton = page.getByRole('button', { name: /sign up/i });
    await signUpButton.click();

    // Wait for redirect to home page (indicates successful signup)
    await page.waitForURL('/', { timeout: 10000 });
    
    // Verify we're on the home page and authenticated
    await expect(page).toHaveURL('/');
    
    // Check that sessionStorage has the auth token
    const sessionData = await page.evaluate(() => {
      const keys = Object.keys(sessionStorage);
      const authKeys = keys.filter(k => k.includes('supabase.auth'));
      return authKeys.map(k => ({ key: k, hasValue: !!sessionStorage.getItem(k) }));
    });
    
    expect(sessionData.length).toBeGreaterThan(0);
    expect(sessionData.some(d => d.hasValue)).toBeTruthy();

    // Test session persistence: Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still be on home page (not redirected to /auth)
    await expect(page).toHaveURL('/');
    
    // Verify session is still in sessionStorage
    const sessionDataAfterReload = await page.evaluate(() => {
      const keys = Object.keys(sessionStorage);
      const authKeys = keys.filter(k => k.includes('supabase.auth'));
      return authKeys.map(k => ({ key: k, hasValue: !!sessionStorage.getItem(k) }));
    });
    
    expect(sessionDataAfterReload.length).toBeGreaterThan(0);
    expect(sessionDataAfterReload.some(d => d.hasValue)).toBeTruthy();

    // Test navigation to another route and back
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/clients');
    
    // Navigate back to home
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/');

    // Final verification: Session should still be valid
    const finalSessionData = await page.evaluate(() => {
      const keys = Object.keys(sessionStorage);
      const authKeys = keys.filter(k => k.includes('supabase.auth'));
      return authKeys.map(k => ({ key: k, hasValue: !!sessionStorage.getItem(k) }));
    });
    
    expect(finalSessionData.length).toBeGreaterThan(0);
    expect(finalSessionData.some(d => d.hasValue)).toBeTruthy();
  });
});
