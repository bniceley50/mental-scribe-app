/**
 * P2 FIX: Playwright Global Setup
 * 
 * Generates auth state for authenticated tests and sets up test environment
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up Playwright test environment...');

  // P2 FIX: Check for destructive test environment
  if (process.env.NODE_ENV === 'production') {
    throw new Error('❌ CRITICAL: Cannot run E2E tests in production environment!');
  }

  // P2 FIX: Warn about destructive patterns
  const denylist = process.env.PLAYWRIGHT_PAGE_DENYLIST;
  if (denylist) {
    console.log(`🚫 Destructive action denylist: ${denylist}`);
  }

  // Generate auth storage state for authenticated tests
  // This prevents tests from repeatedly logging in
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to auth page
    await page.goto(config.use?.baseURL || 'http://localhost:7997');
    
    // Check if already authenticated
    const isAuthenticated = await page.evaluate(() => {
      return !!localStorage.getItem('supabase.auth.token');
    });

    if (!isAuthenticated) {
      console.log('⚠️ No auth state found - tests requiring auth will fail');
      console.log('💡 Run: npm run test:auth-setup to generate auth state');
    } else {
      console.log('✅ Auth state detected');
      
      // Save storage state for reuse
      await context.storageState({ path: 'test-results/.auth/user.json' });
    }
  } catch (error) {
    console.warn('⚠️ Auth state setup failed:', error);
    // Don't fail setup - some tests may not need auth
  } finally {
    await browser.close();
  }

  console.log('✅ Playwright setup complete');
}

export default globalSetup;
