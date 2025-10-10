import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'testpassword123',
    displayName: 'Test User E2E'
  };

  test('should complete signup and login flow', async ({ page }) => {
    // Go to homepage
    await page.goto('/');
    
    // Click signup link
    await page.click('text=Sign up');
    await expect(page).toHaveURL('/signup');
    
    // Fill signup form (step 1 - basic info)
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.fill('input[placeholder*="display name" i]', testUser.displayName);
    
    // Continue to step 2
    await page.click('button:has-text("Continue")');
    
    // Fill step 2 - platforms (select at least one)
    await page.click('text=TikTok');
    await page.click('button:has-text("Continue")');
    
    // Fill step 3 - niches (select at least one) 
    await page.click('text=Gaming');
    await page.click('button:has-text("Continue")');
    
    // Fill step 4 - location
    await page.fill('input[placeholder*="city" i]', 'Los Angeles');
    
    // Complete signup
    await page.click('button:has-text("Create Account")');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    
    // Verify user is logged in
    await expect(page.locator('text="Welcome"')).toBeVisible();
    
    // Logout
    await page.click('[data-testid="logout-button"], text="Logout"');
    
    // Should redirect to home
    await expect(page).toHaveURL('/');
    
    // Login with same credentials
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button:has-text("Sign In")');
    
    // Should redirect to dashboard again
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    await expect(page.locator('text="Welcome"')).toBeVisible();
  });

  test('should show error for invalid login', async ({ page }) => {
    await page.goto('/');
    
    // Try invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("Sign In")');
    
    // Should show error message
    await expect(page.locator('text="Invalid credentials"')).toBeVisible({ timeout: 5000 });
  });
});