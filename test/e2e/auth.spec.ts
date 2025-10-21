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
});
