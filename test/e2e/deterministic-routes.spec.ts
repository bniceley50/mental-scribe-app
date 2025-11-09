import { test, expect } from '@playwright/test';
import routes from '../routes.json';

/**
 * Deterministic route testing using predefined route list
 * Ensures all critical routes are tested consistently
 */
test.describe('Deterministic Routes', () => {
  // Test all routes from the routes.json file
  for (const route of routes) {
    test(`${route.name} (${route.url}) loads successfully`, async ({ page }) => {
      // Skip authenticated routes in basic tests
      // For authenticated tests, add auth state setup
      if (route.authenticated) {
        test.skip(!process.env.TEST_WITH_AUTH, 'Auth required');
      }

      await page.goto(route.url);
      await page.waitForLoadState('networkidle');

      // Verify page loaded (no error page)
      const notFoundText = await page.locator('text=404').count();
      expect(notFoundText).toBe(0);

      // Verify page has content
      const bodyContent = await page.textContent('body');
      expect(bodyContent).toBeTruthy();
      expect(bodyContent!.length).toBeGreaterThan(0);
    });

    test(`${route.name} (${route.url}) has no console errors`, async ({ page }) => {
      if (route.authenticated) {
        test.skip(!process.env.TEST_WITH_AUTH, 'Auth required');
      }

      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(route.url);
      await page.waitForLoadState('networkidle');

      // Filter out known acceptable errors (adjust as needed)
      const actualErrors = consoleErrors.filter(
        (err) => !err.includes('Failed to load resource') && 
                 !err.includes('favicon')
      );

      expect(actualErrors).toEqual([]);
    });
  }

  test('all critical routes are accessible', async ({ page }) => {
    const criticalRoutes = routes.filter(r => r.priority === 'critical');
    
    for (const route of criticalRoutes) {
      if (route.authenticated) continue;
      
      const response = await page.goto(route.url);
      expect(response?.status()).toBeLessThan(400);
    }
  });

  test('route list matches implementation', async ({ page }) => {
    // Verify that all routes in our list actually exist
    const publicRoutes = routes.filter(r => !r.authenticated);
    
    for (const route of publicRoutes) {
      const response = await page.goto(route.url);
      
      // Should not be 404
      expect(response?.status()).not.toBe(404);
      
      // Should be either 200 (OK) or 302 (redirect to auth)
      expect([200, 302, 303]).toContain(response?.status() || 200);
    }
  });
});
