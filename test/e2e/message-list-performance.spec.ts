// test/e2e/message-list-performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Message List Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app (adjust URL as needed)
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
  });

  test('should handle large message lists efficiently', async ({ page }) => {
    // Mock a large number of messages
    await page.route('**/messages*', async (route) => {
      const messages = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Test message ${i + 1}`,
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        type: 'user'
      }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages, hasMore: false })
      });
    });

    // Measure initial load time
    const startTime = Date.now();
    await page.reload();
    await page.waitForSelector('[data-testid="message-list"]');
    const loadTime = Date.now() - startTime;
    
    console.log(`Initial load time with 1000 messages: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds

    // Check that only visible messages are rendered (virtualization)
    const renderedMessages = await page.locator('[data-testid="message-item"]').count();
    console.log(`Rendered messages: ${renderedMessages}`);
    expect(renderedMessages).toBeLessThan(100); // Should virtualize, not render all 1000

    // Test scroll performance
    const scrollStartTime = Date.now();
    await page.locator('[data-testid="message-list"]').hover();
    
    // Scroll through the list
    for (let i = 0; i < 10; i++) {
      await page.wheel(0, 500);
      await page.waitForTimeout(50); // Small delay between scrolls
    }
    
    const scrollTime = Date.now() - scrollStartTime;
    console.log(`Scroll performance (10 scrolls): ${scrollTime}ms`);
    expect(scrollTime).toBeLessThan(2000); // Should scroll smoothly
  });

  test('should maintain scroll position when new messages arrive', async ({ page }) => {
    // Load initial messages
    await page.route('**/messages*', async (route) => {
      const messages = Array.from({ length: 50 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Initial message ${i + 1}`,
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        type: 'user'
      }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages, hasMore: false })
      });
    });

    await page.reload();
    await page.waitForSelector('[data-testid="message-list"]');

    // Scroll to middle of the list
    const messageList = page.locator('[data-testid="message-list"]');
    await messageList.hover();
    for (let i = 0; i < 5; i++) {
      await page.wheel(0, 200);
      await page.waitForTimeout(100);
    }

    // Get current scroll position
    const scrollPosition = await messageList.evaluate(el => el.scrollTop);
    
    // Mock new message arrival
    await page.route('**/messages*', async (route) => {
      const newMessages = [
        {
          id: 'new-msg-1',
          content: 'New message that just arrived',
          timestamp: new Date().toISOString(),
          type: 'assistant'
        }
      ];
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages: newMessages, hasMore: false })
      });
    });

    // Trigger new message (simulate WebSocket or polling)
    await page.evaluate(() => {
      // Simulate receiving new message
      window.dispatchEvent(new CustomEvent('newMessage', {
        detail: {
          id: 'new-msg-1',
          content: 'New message that just arrived',
          timestamp: new Date().toISOString(),
          type: 'assistant'
        }
      }));
    });

    await page.waitForTimeout(500); // Allow for state updates

    // Check that scroll position is maintained (or properly adjusted)
    const newScrollPosition = await messageList.evaluate(el => el.scrollTop);
    
    // Should maintain position if user was not at bottom, or auto-scroll if at bottom
    if (scrollPosition > 0) {
      expect(Math.abs(newScrollPosition - scrollPosition)).toBeLessThan(100);
    }
  });

  test('should handle rapid message updates without performance degradation', async ({ page }) => {
    let messageCount = 0;
    
    // Mock rapid message updates
    await page.route('**/messages*', async (route) => {
      messageCount += 1;
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        id: `rapid-msg-${i}`,
        content: `Rapid message ${i + 1}`,
        timestamp: new Date(Date.now() - i * 100).toISOString(),
        type: i % 2 === 0 ? 'user' : 'assistant'
      }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages, hasMore: false })
      });
    });

    await page.reload();
    await page.waitForSelector('[data-testid="message-list"]');

    // Simulate rapid updates
    const updateStartTime = Date.now();
    
    for (let i = 0; i < 20; i++) {
      await page.evaluate((index) => {
        window.dispatchEvent(new CustomEvent('messageUpdate', {
          detail: { messageIndex: index }
        }));
      }, i);
      
      await page.waitForTimeout(50); // 20 updates per second
    }
    
    const updateTime = Date.now() - updateStartTime;
    console.log(`Rapid update performance (20 updates): ${updateTime}ms`);
    
    // Should handle rapid updates without freezing
    expect(updateTime).toBeLessThan(3000);
    
    // UI should still be responsive
    const sendButton = page.locator('[data-testid="send-button"]');
    await expect(sendButton).toBeEnabled();
    
    // Should be able to interact with the interface
    await page.locator('[data-testid="message-input"]').click();
    await page.locator('[data-testid="message-input"]').fill('Performance test message');
    
    const interactionTime = Date.now();
    await sendButton.click();
    const responseTime = Date.now() - interactionTime;
    
    console.log(`UI interaction response time: ${responseTime}ms`);
    expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
  });

  test('should efficiently load message history on scroll', async ({ page }) => {
    let loadCount = 0;
    
    // Mock paginated message loading
    await page.route('**/messages*', async (route) => {
      const url = new URL(route.request().url());
      const cursor = url.searchParams.get('cursor');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      
      loadCount += 1;
      
      const startIndex = cursor ? parseInt(cursor) : 0;
      const messages = Array.from({ length: limit }, (_, i) => ({
        id: `history-msg-${startIndex + i}`,
        content: `History message ${startIndex + i + 1}`,
        timestamp: new Date(Date.now() - (startIndex + i) * 1000).toISOString(),
        type: (startIndex + i) % 2 === 0 ? 'user' : 'assistant'
      }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          messages, 
          hasMore: startIndex + limit < 200, // Simulate 200 total messages
          nextCursor: startIndex + limit < 200 ? (startIndex + limit).toString() : null
        })
      });
    });

    await page.reload();
    await page.waitForSelector('[data-testid="message-list"]');

    // Initial load should be fast
    expect(loadCount).toBe(1);

    // Scroll to top to trigger history loading
    const messageList = page.locator('[data-testid="message-list"]');
    await messageList.hover();
    
    const initialMessageCount = await page.locator('[data-testid="message-item"]').count();
    
    // Scroll up to load more history
    for (let i = 0; i < 3; i++) {
      await page.wheel(0, -500);
      await page.waitForTimeout(200);
    }
    
    // Should have loaded more messages
    await page.waitForTimeout(1000); // Allow for loading
    const newMessageCount = await page.locator('[data-testid="message-item"]').count();
    
    console.log(`Messages before scroll: ${initialMessageCount}, after: ${newMessageCount}`);
    console.log(`Total API calls: ${loadCount}`);
    
    // Should have loaded more messages
    expect(newMessageCount).toBeGreaterThan(initialMessageCount);
    
    // Should not make excessive API calls
    expect(loadCount).toBeLessThan(5);
  });
});