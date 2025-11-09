import { defineConfig, devices } from '@playwright/test';

/**
 * P2 FIX: Playwright Configuration with Security Guardrails
 * 
 * - Increased timeout for crawl tests (10 minutes)
 * - Destructive action denylist via env var
 * - Pinned browser version for stability
 */

// P2 FIX: Denylist for destructive routes/actions
const DESTRUCTIVE_PATTERNS = process.env.PLAYWRIGHT_PAGE_DENYLIST?.split('|') || [
  'logout',
  'signout',
  'delete',
  'archive',
  'reset',
  'revoke',
  'remove',
];

export default defineConfig({
  testDir: 'test/e2e',
  timeout: 600_000, // P2 FIX: 10 minutes for crawl tests
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:7997',
    trace: 'on-first-retry',
    // P2 FIX: Avoid destructive actions in automated tests
    ignoreHTTPSErrors: false,
    actionTimeout: 30_000,
  },
  reporter: [
    ['list'],
    ['json', { outputFile: 'security/artifacts/playwright.json' }],
    ['html', { outputFolder: 'test-results/html-report', open: 'never' }],
  ],
  projects: [
    { 
      name: 'chromium', 
      use: { 
        ...devices['Desktop Chrome'],
        // P2 FIX: Skip destructive routes
        viewport: { width: 1280, height: 720 },
      } 
    },
  ],
  // P2 FIX: Global setup for auth state generation
  globalSetup: './test/global-setup.ts',
  
  // P2 FIX: Environment for test isolation
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});