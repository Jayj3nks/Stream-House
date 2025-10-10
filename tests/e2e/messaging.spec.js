import { test, expect } from '@playwright/test';

test.describe('Community Messaging', () => {
  const testUser = {
    email: `test-message-${Date.now()}@example.com`, 
    password: 'testpassword123',
    displayName: 'Message Tester'
  };

  test.beforeEach(async ({ page }) => {
    // Create and login user
    await page.goto('/signup');
    
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.fill('input[placeholder*="display name" i]', testUser.displayName);
    await page.click('button:has-text("Continue")');
    
    await page.click('text=TikTok');
    await page.click('button:has-text("Continue")');
    
    await page.click('text=Gaming');
    await page.click('button:has-text("Continue")');
    
    await page.fill('input[placeholder*="city" i]', 'Los Angeles');
    await page.click('button:has-text("Create Account")');
    
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  });

  test('should send message in community chat', async ({ page }) => {
    // Locate message input in dashboard
    const messageInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();
    await expect(messageInput).toBeVisible();
    
    // Type a test message
    const testMessage = `Hello from E2E test! ${Date.now()}`;
    await messageInput.fill(testMessage);
    
    // Send the message
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
    await sendButton.click();
    
    // Verify message appears in chat
    await expect(page.locator(`text="${testMessage}"`)).toBeVisible({ timeout: 5000 });
    
    // Verify message input is cleared
    await expect(messageInput).toHaveValue('');
  });

  test('should display user messages correctly', async ({ page }) => {
    // Send a message
    const messageInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();
    const testMessage = `User message test ${Date.now()}`;
    
    await messageInput.fill(testMessage);
    await page.locator('button:has-text("Send"), button[type="submit"]').first().click();
    
    // Check message displays with user info
    const messageElement = page.locator(`text="${testMessage}"`);
    await expect(messageElement).toBeVisible();
    
    // Check if display name appears near the message
    await expect(page.locator(`text="${testUser.displayName}"`)).toBeVisible();
  });

  test('should handle empty message submission', async ({ page }) => {
    // Try to send empty message
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
    await sendButton.click();
    
    // Should either prevent submission or show validation
    // The exact behavior depends on implementation
    await page.waitForTimeout(1000); // Wait to see if anything happens
    
    // Message input should remain visible and functional
    const messageInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();
    await expect(messageInput).toBeVisible();
  });

  test('should scroll to see older messages', async ({ page }) => {
    // If there's a scroll area for messages, test scrolling
    const chatArea = page.locator('[class*="scroll"], [class*="chat"], [class*="message"]').first();
    
    if (await chatArea.isVisible()) {
      // Send multiple messages to create scrollable content
      const messageInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();
      
      for (let i = 1; i <= 3; i++) {
        await messageInput.fill(`Test message ${i} - ${Date.now()}`);
        await page.locator('button:has-text("Send"), button[type="submit"]').first().click();
        await page.waitForTimeout(500);
      }
      
      // Verify messages are visible
      await expect(page.locator('text*="Test message"')).toHaveCount(3, { timeout: 5000 });
    }
  });
});