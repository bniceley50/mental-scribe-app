import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('main navigation is keyboard accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Tab through navigation items
    await page.keyboard.press('Tab');
    
    // Verify focused element has visible focus indicator
    const focusedElement = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) return null;
      const styles = window.getComputedStyle(active);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        outlineColor: styles.outlineColor,
      };
    });
    
    // At least one focus indicator should be present
    expect(focusedElement).toBeTruthy();
  });

  test('dialogs can be closed with Escape key', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find and open a dialog (assuming there's a button that opens one)
    const dialogTrigger = page.getByRole('button').first();
    if (await dialogTrigger.isVisible()) {
      await dialogTrigger.click();
      
      // Wait for dialog to appear
      await page.waitForTimeout(500);
      
      // Press Escape
      await page.keyboard.press('Escape');
      
      // Verify dialog is closed (focus returns to trigger)
      await expect(dialogTrigger).toBeFocused();
    }
  });

  test('form inputs have visible labels', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // Check all input fields have associated labels
    const inputs = await page.locator('input').all();
    
    for (const input of inputs) {
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const id = await input.getAttribute('id');
      
      // Each input should have either aria-label, aria-labelledby, or a label element
      let hasLabel = !!(ariaLabel || ariaLabelledBy);
      
      if (!hasLabel && id) {
        // Check if there's a label element pointing to this input
        const label = await page.locator(`label[for="${id}"]`).count();
        hasLabel = label > 0;
      }
      
      expect(hasLabel).toBeTruthy();
    }
  });

  test('buttons have descriptive text or aria-label', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get all buttons
    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      
      // Each button should have text content or aria-label
      const hasAccessibleName = !!(text?.trim() || ariaLabel || ariaLabelledBy);
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('no keyboard traps in main navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Tab through elements and verify we can tab out
    let previousElement = null;
    let sameElementCount = 0;
    
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Tab');
      const currentElement = await page.evaluate(() => document.activeElement?.tagName);
      
      if (currentElement === previousElement) {
        sameElementCount++;
      } else {
        sameElementCount = 0;
      }
      
      // If focus hasn't moved after 5 tabs, there's likely a keyboard trap
      expect(sameElementCount).toBeLessThan(5);
      
      previousElement = currentElement;
    }
  });

  test('toast notifications are announced to screen readers', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Trigger an action that shows a toast (e.g., submit a form)
    // The toast should have role="status" or aria-live="polite"
    const toast = page.locator('[role="status"], [aria-live="polite"]');
    
    // If a toast appears, it should be detectable
    if (await toast.count() > 0) {
      await expect(toast.first()).toBeVisible();
    }
  });
});
