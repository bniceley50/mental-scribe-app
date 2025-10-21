import { test, expect } from '@playwright/test';

const BASE_URL = 'https://mental-scribe-app.vercel.app';

test.describe('Manual Button Test - Identify Non-Working Buttons', () => {
  
  test('Catalog all buttons and their functionality', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for full render
    
    console.log('\n========================================');
    console.log('BUTTON FUNCTIONALITY REPORT');
    console.log('========================================\n');
    
    // Get all buttons
    const buttons = await page.locator('button').all();
    console.log(`Total buttons found: ${buttons.length}\n`);
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      
      // Get button properties
      const isVisible = await button.isVisible().catch(() => false);
      if (!isVisible) continue;
      
      const text = await button.innerText().catch(() => '');
      const isEnabled = await button.isEnabled().catch(() => false);
      const ariaLabel = await button.getAttribute('aria-label').catch(() => null);
      const className = await button.getAttribute('class').catch(() => '');
      const id = await button.getAttribute('id').catch(() => '');
      
      console.log(`Button ${i + 1}:`);
      console.log(`  Text: "${text}"`);
      console.log(`  Enabled: ${isEnabled ? '✓ YES' : '✗ NO'}`);
      console.log(`  Visible: ${isVisible ? '✓ YES' : '✗ NO'}`);
      if (ariaLabel) console.log(`  Aria Label: "${ariaLabel}"`);
      if (id) console.log(`  ID: "${id}"`);
      
      // Try to click if enabled
      if (isEnabled) {
        try {
          const clickPromise = button.click({ timeout: 2000 });
          await clickPromise;
          await page.waitForTimeout(500);
          console.log(`  Click Result: ✓ Successfully clicked`);
        } catch (error) {
          console.log(`  Click Result: ✗ Failed to click`);
          console.log(`  Error: ${error}`);
        }
      } else {
        console.log(`  Click Result: ⊘ Button is disabled`);
      }
      
      console.log('');
      
      // Go back to main page for next test
      await page.goto(BASE_URL);
      await page.waitForTimeout(1000);
    }
    
    console.log('========================================\n');
  });

  test('Test specific UI sections', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('\n========================================');
    console.log('UI SECTIONS FUNCTIONALITY TEST');
    console.log('========================================\n');
    
    // Test Authentication Section
    console.log('1. AUTHENTICATION SECTION:');
    const emailInput = page.locator('input[type="email"]').first();
    const hasEmailInput = await emailInput.count() > 0;
    console.log(`   Email input present: ${hasEmailInput ? '✓' : '✗'}`);
    
    if (hasEmailInput) {
      const isEmailEnabled = await emailInput.isEnabled();
      console.log(`   Email input enabled: ${isEmailEnabled ? '✓' : '✗'}`);
    }
    
    const passwordInput = page.locator('input[type="password"]').first();
    const hasPasswordInput = await passwordInput.count() > 0;
    console.log(`   Password input present: ${hasPasswordInput ? '✓' : '✗'}`);
    
    // Test Quick Actions
    console.log('\n2. QUICK ACTIONS SECTION:');
    const quickActions = page.getByText(/quick actions/i);
    const hasQuickActions = await quickActions.count() > 0;
    console.log(`   Quick Actions visible: ${hasQuickActions ? '✓' : '✗'}`);
    
    // Test Template Selection
    console.log('\n3. TEMPLATE SECTION:');
    const templates = page.locator('[data-testid*="template"], [class*="template"]');
    const templateCount = await templates.count();
    console.log(`   Templates found: ${templateCount}`);
    
    // Test Navigation
    console.log('\n4. NAVIGATION:');
    const navLinks = page.locator('nav a, nav button');
    const navCount = await navLinks.count();
    console.log(`   Navigation items: ${navCount}`);
    
    // Test Session List
    console.log('\n5. SESSION LIST:');
    const sessions = page.getByText(/session/i);
    const sessionCount = await sessions.count();
    console.log(`   Session-related elements: ${sessionCount}`);
    
    // Test Analysis Buttons
    console.log('\n6. ANALYSIS BUTTONS:');
    const analyzeButtons = page.getByRole('button', { name: /analyz/i });
    const analyzeCount = await analyzeButtons.count();
    console.log(`   Analyze buttons found: ${analyzeCount}`);
    
    for (let i = 0; i < analyzeCount; i++) {
      const btn = analyzeButtons.nth(i);
      const text = await btn.innerText();
      const enabled = await btn.isEnabled();
      console.log(`   - "${text}": ${enabled ? '✓ Enabled' : '✗ Disabled'}`);
    }
    
    console.log('\n========================================\n');
  });

  test('Test interactive elements', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('\n========================================');
    console.log('INTERACTIVE ELEMENTS TEST');
    console.log('========================================\n');
    
    // Test all input fields
    console.log('INPUT FIELDS:');
    const inputs = await page.locator('input:visible').all();
    console.log(`Found ${inputs.length} visible inputs\n`);
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const type = await input.getAttribute('type');
      const placeholder = await input.getAttribute('placeholder');
      const name = await input.getAttribute('name');
      const isEnabled = await input.isEnabled();
      
      console.log(`Input ${i + 1}:`);
      console.log(`  Type: ${type}`);
      if (placeholder) console.log(`  Placeholder: "${placeholder}"`);
      if (name) console.log(`  Name: "${name}"`);
      console.log(`  Enabled: ${isEnabled ? '✓' : '✗'}`);
      
      if (isEnabled) {
        try {
          await input.focus();
          await input.fill('test');
          const value = await input.inputValue();
          console.log(`  Test input: ${value === 'test' ? '✓ Working' : '✗ Not working'}`);
          await input.clear();
        } catch (e) {
          console.log(`  Test input: ✗ Failed`);
        }
      }
      console.log('');
    }
    
    // Test textareas
    console.log('TEXTAREA FIELDS:');
    const textareas = await page.locator('textarea:visible').all();
    console.log(`Found ${textareas.length} visible textareas\n`);
    
    for (let i = 0; i < textareas.length; i++) {
      const textarea = textareas[i];
      const placeholder = await textarea.getAttribute('placeholder');
      const isEnabled = await textarea.isEnabled();
      
      console.log(`Textarea ${i + 1}:`);
      if (placeholder) console.log(`  Placeholder: "${placeholder}"`);
      console.log(`  Enabled: ${isEnabled ? '✓' : '✗'}`);
      console.log('');
    }
    
    // Test select dropdowns
    console.log('SELECT DROPDOWNS:');
    const selects = await page.locator('select:visible').all();
    console.log(`Found ${selects.length} visible dropdowns\n`);
    
    console.log('========================================\n');
  });
});
