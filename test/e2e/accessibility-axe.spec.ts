import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Automated WCAG accessibility testing using axe-core
 * Catches common a11y issues at crawl time
 */
test.describe('Accessibility (axe-core)', () => {
  test('home page has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('auth page has no accessibility violations', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('settings page has no accessibility violations', async ({ page }) => {
    // Note: This test assumes auth is handled or page is accessible
    // Adjust navigation as needed for your auth flow
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('no color contrast violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .disableRules(['color-contrast']) // We'll check this explicitly
      .analyze();
    
    // Now check color contrast specifically
    const contrastResults = await new AxeBuilder({ page })
      .include('body')
      .options({ runOnly: { type: 'rule', values: ['color-contrast'] } })
      .analyze();
    
    expect(contrastResults.violations).toEqual([]);
  });

  test('all images have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ runOnly: { type: 'rule', values: ['image-alt'] } })
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('form controls have labels', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ 
        runOnly: { 
          type: 'rule', 
          values: ['label', 'label-content-name-mismatch', 'form-field-multiple-labels'] 
        } 
      })
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('page has valid HTML structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ 
        runOnly: { 
          type: 'rule', 
          values: ['landmark-one-main', 'page-has-heading-one', 'bypass'] 
        } 
      })
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ 
        runOnly: { 
          type: 'rule', 
          values: ['button-name', 'link-name', 'tabindex', 'accesskeys'] 
        } 
      })
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('ARIA attributes are valid', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .options({ 
        runOnly: { 
          type: 'rule', 
          values: [
            'aria-allowed-attr',
            'aria-required-attr',
            'aria-valid-attr',
            'aria-valid-attr-value',
            'aria-roles'
          ] 
        } 
      })
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('no duplicate IDs on page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ runOnly: { type: 'rule', values: ['duplicate-id', 'duplicate-id-active'] } })
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
