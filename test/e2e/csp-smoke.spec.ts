import { test, expect } from '@playwright/test';

test('prod preview renders without blocking CSP violations', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });

  const childCount = await page.evaluate(() => document.getElementById('root')?.children.length ?? 0);
  expect(childCount).toBeGreaterThan(0);

  const cspViolations = errors.filter((e) => /Refused to .* Content Security Policy/i.test(e));
  expect(cspViolations).toHaveLength(0);
});
