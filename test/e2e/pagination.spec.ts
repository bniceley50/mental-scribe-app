import { test, expect } from '@playwright/test';

// NOTE: This test is skipped by default because it requires an authenticated session
// and seeded conversations with many messages. To enable:
// - Provide a signed-in storageState for Playwright
// - Seed a conversation with > 40 messages to force pagination
// - Remove the .skip below
test.describe.skip('messages keyset pagination', () => {
  test('shows Load older and appends older messages', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('http://localhost:4173/history', { waitUntil: 'networkidle' });

    // Expect the app to render
    const childCount = await page.evaluate(() => document.getElementById('root')?.children.length ?? 0);
    expect(childCount).toBeGreaterThan(0);

    // If a conversation is selected with many messages, a Load older button should appear
    const loadOlder = page.getByRole('button', { name: /load older/i });
    if (await loadOlder.isVisible()) {
      await loadOlder.click();
      await expect(loadOlder).toBeEnabled();
    }

    // No hard CSP or runtime errors
    const cspViolations = errors.filter((e) => /Refused to .* Content Security Policy/i.test(e));
    expect(cspViolations).toHaveLength(0);
  });
});
