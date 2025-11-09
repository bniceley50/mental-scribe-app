import { test, expect } from '@playwright/test';

test.describe('Authentication - Accessibility & Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
  });

  test('displays login form with proper ARIA attributes', async ({ page }) => {
    // Check for email and password inputs
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    
    // Verify inputs have proper autocomplete attributes
    await expect(emailInput).toHaveAttribute('autocomplete', 'username');
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    
    // Verify no autocapitalize or spellcheck on email
    await expect(emailInput).toHaveAttribute('autocapitalize', 'none');
    await expect(emailInput).toHaveAttribute('spellcheck', 'false');
    await expect(emailInput).toHaveAttribute('inputmode', 'email');
    
    // Verify password has type="password"
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('tab semantics work correctly with keyboard navigation', async ({ page }) => {
    const signInTab = page.getByRole('tab', { name: /sign in/i });
    const signUpTab = page.getByRole('tab', { name: /sign up/i });
    
    // Check ARIA attributes
    await expect(signInTab).toHaveAttribute('aria-selected', 'true');
    await expect(signUpTab).toHaveAttribute('aria-selected', 'false');
    
    // Navigate with keyboard
    await signInTab.focus();
    await signInTab.press('ArrowRight');
    
    // Sign Up tab should now be selected
    await expect(signUpTab).toHaveAttribute('aria-selected', 'true');
    await expect(signInTab).toHaveAttribute('aria-selected', 'false');
    
    // Email field should be focused after tab switch
    await page.waitForTimeout(200);
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeFocused();
  });

  test('password visibility toggle works with proper ARIA', async ({ page }) => {
    const passwordInput = page.getByLabel(/^password$/i).first();
    const toggleButton = page.getByRole('button', { name: /show password/i });
    
    // Initially password is hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    
    // Click to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    
    // Click to hide password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('shows inline error messages with proper focus management', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/^password$/i).first();
    const signInButton = page.getByRole('button', { name: /^sign in$/i });
    
    // Fill in invalid credentials
    await emailInput.fill('invalid-email');
    await passwordInput.fill('short');
    
    // Submit form
    await signInButton.click();
    
    // Wait for error summary to appear
    const errorSummary = page.locator('[role="alert"][aria-live="assertive"]');
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary).toBeFocused();
    
    // Check for specific field errors
    await expect(page.locator('#email-error')).toBeVisible();
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('password reset link is keyboard accessible', async ({ page }) => {
    const forgotPasswordLink = page.getByText(/forgot.*password/i);
    
    if (await forgotPasswordLink.isVisible()) {
      // Tab to the link
      await forgotPasswordLink.focus();
      await expect(forgotPasswordLink).toBeFocused();
      
      // Verify it's keyboard activatable
      await forgotPasswordLink.press('Enter');
      
      // Should show password reset UI
      await expect(page.getByText(/send reset link/i)).toBeVisible();
    }
  });

  test('form labels are properly associated with inputs', async ({ page }) => {
    // Check email input has associated label
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('id', 'email-input');
    
    // Check password input has associated label
    const passwordInput = page.getByLabel(/^password$/i).first();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveAttribute('id', 'password-input');
  });

  test('sign up form has proper attributes for password managers', async ({ page }) => {
    const signUpTab = page.getByRole('tab', { name: /sign up/i });
    await signUpTab.click();
    
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/^password$/i).first();
    
    // Check email attributes
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('autocomplete', 'username');
    await expect(emailInput).toHaveAttribute('inputmode', 'email');
    
    // Check password attributes for new password
    await expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
  });

  test('loading states show spinner and aria-busy', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/^password$/i).first();
    const signInButton = page.getByRole('button', { name: /^sign in$/i });
    
    await emailInput.fill('test@example.com');
    await passwordInput.fill('Test1234!@#$');
    
    // Start submission
    await signInButton.click();
    
    // Check for loading state (may be brief)
    const loadingButton = page.getByRole('button', { name: /signing in/i });
    if (await loadingButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(loadingButton).toHaveAttribute('aria-busy', 'true');
      await expect(loadingButton).toBeDisabled();
    }
  });

  test('skip to content link is keyboard accessible', async ({ page }) => {
    // Focus the page
    await page.keyboard.press('Tab');
    
    // Skip link should be focused and visible
    const skipLink = page.getByText(/skip to content/i);
    await expect(skipLink).toBeFocused();
  });

  test('page title updates based on tab', async ({ page }) => {
    // Check initial title
    await expect(page).toHaveTitle(/sign in.*clinicalai assistant/i);
    
    // Switch to sign up
    const signUpTab = page.getByRole('tab', { name: /sign up/i });
    await signUpTab.click();
    
    // Check updated title
    await expect(page).toHaveTitle(/sign up.*clinicalai assistant/i);
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

  test('password strength meter shows for weak password', async ({ page }) => {
    const signUpTab = page.getByRole('tab', { name: /sign up/i });
    await signUpTab.click();
    
    const passwordInput = page.getByLabel(/^password$/i).first();
    
    // Type weak password
    await passwordInput.fill('password123');
    
    // Wait for strength meter to appear
    await page.waitForTimeout(100);
    
    // Should show weak strength
    const strengthLabel = page.locator('text=/weak/i');
    await expect(strengthLabel).toBeVisible();
    
    // Progress bar should be visible
    const progressBar = page.locator('[role="progressbar"][aria-label="Password strength"]');
    await expect(progressBar).toBeVisible();
    await expect(progressBar).toHaveAttribute('aria-valuenow', '1');
  });

  test('password strength meter shows good for strong password', async ({ page }) => {
    const signUpTab = page.getByRole('tab', { name: /sign up/i });
    await signUpTab.click();
    
    const passwordInput = page.getByLabel(/^password$/i).first();
    
    // Type strong password
    await passwordInput.fill('S3cure!CorrectHorse#2024');
    
    // Wait for strength meter
    await page.waitForTimeout(100);
    
    // Should show good/strong strength
    const strengthLabel = page.locator('text=/(good|strong)/i');
    await expect(strengthLabel).toBeVisible();
    
    // Progress bar should show high value
    const progressBar = page.locator('[role="progressbar"][aria-label="Password strength"]');
    const valueNow = await progressBar.getAttribute('aria-valuenow');
    expect(parseInt(valueNow || '0')).toBeGreaterThanOrEqual(3);
  });

  test('HIBP breach detection shows for known leaked password', async ({ page }) => {
    const signUpTab = page.getByRole('tab', { name: /sign up/i });
    await signUpTab.click();
    
    const passwordInput = page.getByLabel(/^password$/i).first();
    
    // Type known leaked password
    await passwordInput.fill('password123');
    
    // Wait for HIBP check (debounced 600ms + API call)
    await page.waitForTimeout(2000);
    
    // Should show breach warning
    const breachWarning = page.locator('text=/known in breaches/i');
    await expect(breachWarning).toBeVisible();
  });

  test('HIBP shows not found for strong unique password', async ({ page }) => {
    const signUpTab = page.getByRole('tab', { name: /sign up/i });
    await signUpTab.click();
    
    const passwordInput = page.getByLabel(/^password$/i).first();
    
    // Type very unlikely to be breached password
    await passwordInput.fill('xK9#mP2$vL8@nQ4!wR7^yT6&uI3*oE5');
    
    // Wait for HIBP check
    await page.waitForTimeout(2000);
    
    // Should show not found message
    const safeMessage = page.locator('text=/not found in known breaches/i');
    await expect(safeMessage).toBeVisible();
  });

  test('password strength suggestions appear for weak passwords', async ({ page }) => {
    const signUpTab = page.getByRole('tab', { name: /sign up/i });
    await signUpTab.click();
    
    const passwordInput = page.getByLabel(/^password$/i).first();
    
    // Type weak password
    await passwordInput.fill('abc');
    
    // Wait for analysis
    await page.waitForTimeout(100);
    
    // Should show suggestions list
    const suggestions = page.locator('ul li');
    const count = await suggestions.count();
    expect(count).toBeGreaterThan(0);
    
    // Should have helpful text
    await expect(page.locator('text=/12\\+ characters/i')).toBeVisible();
  });

  test('keyboard navigation works with password visibility toggle', async ({ page }) => {
    const signUpTab = page.getByRole('tab', { name: /sign up/i });
    await signUpTab.click();
    
    const passwordInput = page.getByLabel(/^password$/i).first();
    const toggleButton = page.getByRole('button', { name: /show password/i });
    
    // Tab to password input
    await passwordInput.focus();
    await expect(passwordInput).toBeFocused();
    
    // Type password
    await passwordInput.fill('TestPassword123!');
    
    // Tab to toggle button
    await page.keyboard.press('Tab');
    await expect(toggleButton).toBeFocused();
    
    // Press space to toggle
    await page.keyboard.press('Space');
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    
    // Press space again to hide
    await page.keyboard.press('Space');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
  });
});
