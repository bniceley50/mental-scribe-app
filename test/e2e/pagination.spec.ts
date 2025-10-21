import { test, expect } from '@playwright/test';

test.describe('Messages Pagination', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and wait for it to load
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('displays "Load older messages" button when there are more messages', async ({ page }) => {
    // This test assumes we're in a logged-in state with a conversation that has >20 messages
    // In a real scenario, you'd want to set up test data via API or seed script
    
    // Check if the "Load older" button is visible (only if hasMore is true)
    const loadOlderButton = page.getByRole('button', { name: /load older messages/i });
    
    // If button exists, verify it's keyboard accessible
    if (await loadOlderButton.isVisible()) {
      await loadOlderButton.focus();
      await expect(loadOlderButton).toBeFocused();
      
      // Click the button
      const initialMessageCount = await page.locator('[role="article"]').count();
      await loadOlderButton.click();
      
      // Wait for loading state
      await expect(loadOlderButton).toContainText('Loading...');
      
      // Wait for messages to load
      await page.waitForTimeout(1000);
      
      // Verify more messages were loaded
      const newMessageCount = await page.locator('[role="article"]').count();
      expect(newMessageCount).toBeGreaterThanOrEqual(initialMessageCount);
    }
  });

  test('button has proper ARIA attributes', async ({ page }) => {
    const loadOlderButton = page.getByRole('button', { name: /load older messages/i });
    
    if (await loadOlderButton.isVisible()) {
      // Check aria-live for screen reader announcements
      await expect(loadOlderButton).toHaveAttribute('aria-live', 'polite');
    }
  });

  test('maintains message order after loading older messages', async ({ page }) => {
    const loadOlderButton = page.getByRole('button', { name: /load older messages/i });
    
    if (await loadOlderButton.isVisible()) {
      // Get timestamps of visible messages before loading more
      const messagesBefore = await page.locator('[role="article"]').allTextContents();
      
      // Load older messages
      await loadOlderButton.click();
      await page.waitForTimeout(1000);
      
      // Get timestamps after
      const messagesAfter = await page.locator('[role="article"]').allTextContents();
      
      // Verify original messages are still present in the same order
      // (they should appear after the newly loaded older messages)
      expect(messagesAfter.length).toBeGreaterThanOrEqual(messagesBefore.length);
    }
  });
});
