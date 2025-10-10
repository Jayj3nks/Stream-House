import { test, expect } from "@playwright/test";

test.describe("House Management", () => {
  const testUser = {
    email: `test-house-${Date.now()}@example.com`,
    password: "testpassword123",
    displayName: "House Creator",
  };

  test.beforeEach(async ({ page }) => {
    // Create and login user
    await page.goto("/signup");

    // Quick signup flow
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.fill(
      'input[placeholder*="display name" i]',
      testUser.displayName,
    );
    await page.click('button:has-text("Continue")');

    await page.click("text=TikTok");
    await page.click('button:has-text("Continue")');

    await page.click("text=Gaming");
    await page.click('button:has-text("Continue")');

    await page.fill('input[placeholder*="city" i]', "Los Angeles");
    await page.click('button:has-text("Create Account")');

    // Wait for dashboard
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
  });

  test("should create a new house", async ({ page }) => {
    // Navigate to house creation
    await page.click('text="Create House"');
    await expect(page).toHaveURL("/house/create");

    // Fill house creation form
    await page.fill('input[placeholder*="house name" i]', "Gaming Legends");
    await page.fill(
      'textarea[placeholder*="description" i]',
      "A house for gaming content creators",
    );

    // Select niches
    await page.click("text=Gaming");

    // Set max members
    await page.fill('input[type="number"]', "10");

    // Add rules
    await page.fill(
      'textarea[placeholder*="rules" i]',
      "Be respectful and supportive",
    );

    // Submit form
    await page.click('button:has-text("Create House")');

    // Should redirect to dashboard or house page
    await expect(page).toHaveURL(/\/(dashboard|house)/, { timeout: 10000 });

    // Verify house was created (should show in user's houses or dashboard)
    await expect(page.locator('text="Gaming Legends"')).toBeVisible({
      timeout: 5000,
    });
  });

  test("should validate required fields", async ({ page }) => {
    await page.click('text="Create House"');
    await expect(page).toHaveURL("/house/create");

    // Try to submit without required fields
    await page.click('button:has-text("Create House")');

    // Should show validation errors
    await expect(page.locator('text*="required"')).toBeVisible({
      timeout: 3000,
    });
  });

  test("should navigate back to dashboard", async ({ page }) => {
    await page.click('text="Create House"');
    await expect(page).toHaveURL("/house/create");

    // Click back or cancel
    await page.click('text="Back", text="Cancel"');

    // Should return to dashboard
    await expect(page).toHaveURL("/dashboard");
  });
});
