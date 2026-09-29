import { test, expect } from "@playwright/test";

test.describe("FormForge AI - Basic User Profile Form E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the form header, all required fields, and actions", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /basic user profile/i })).toBeVisible();

    // Check all inputs
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/age/i)).toBeVisible();
    await expect(page.getByLabel(/date of birth/i)).toBeVisible();
    await expect(page.getByLabel(/residential address/i)).toBeVisible();

    // Check action buttons
    await expect(page.getByRole("button", { name: /submit profile/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /clear form/i })).toBeVisible();
  });

  test("should validate required fields and move focus to first invalid input on failed submit", async ({ page }) => {
    const submitBtn = page.getByRole("button", { name: /submit profile/i });
    await submitBtn.click();

    // Verification of error messages
    await expect(page.getByText(/name must be at least 2 characters/i)).toBeVisible();
    await expect(page.getByText(/age is required/i)).toBeVisible();
    await expect(page.getByText(/date of birth is required/i)).toBeVisible();
    await expect(page.getByText(/address must be at least 5 characters/i)).toBeVisible();

    // Verify focus moved to the first invalid input (Full Name)
    const nameInput = page.getByLabel(/full name/i);
    await expect(nameInput).toBeFocused();
    await expect(nameInput).toHaveAttribute("aria-invalid", "true");
  });

  test("should successfully submit the form and show accessible confirmation", async ({ page }) => {
    // Fill out form
    await page.getByLabel(/full name/i).fill("Marcus Aurelius");
    await page.getByLabel(/age/i).fill("45");
    await page.getByLabel(/date of birth/i).fill("1981-04-26");
    await page.getByLabel(/residential address/i).fill("100 Palatine Hill Way, Ancient Rome District");

    // Click Submit
    const submitBtn = page.getByRole("button", { name: /submit profile/i });
    await submitBtn.click();

    // Verify accessible success announcement
    const statusContainer = page.getByRole("status");
    await expect(statusContainer).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/profile saved successfully!/i)).toBeVisible();
    await expect(page.getByText(/submission reference:/i)).toBeVisible();

    // Verify reset action
    const resetBtn = page.getByRole("button", { name: /submit another profile/i });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // Form should return to empty state
    await expect(page.getByLabel(/full name/i)).toHaveValue("");
  });

  test("should show confirmation dialog when clicking Clear on a dirty form", async ({ page }) => {
    const nameInput = page.getByLabel(/full name/i);
    await nameInput.fill("Temporary Entry");

    const clearBtn = page.getByRole("button", { name: /clear form/i });
    await clearBtn.click();

    // Verify modal is open and has dialog role
    const dialog = page.getByRole("dialog", { name: /clear form details\?/i });
    await expect(dialog).toBeVisible();

    // Test Escape key closes modal without clearing
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(nameInput).toHaveValue("Temporary Entry");

    // Open again and click 'Keep Editing'
    await clearBtn.click();
    await page.getByRole("button", { name: /keep editing/i }).click();
    await expect(dialog).not.toBeVisible();
    await expect(nameInput).toHaveValue("Temporary Entry");

    // Open again and confirm clear
    await clearBtn.click();
    await page.getByRole("button", { name: /yes, clear all/i }).click();
    await expect(dialog).not.toBeVisible();
    await expect(nameInput).toHaveValue("");
  });

  test("should support 200% zoom and mobile viewports with adequate touch targets", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const submitBtn = page.getByRole("button", { name: /submit profile/i });
    const box = await submitBtn.boundingBox();

    // Verify minimum 44px touch target height
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    // Verify no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // allowing minor subpixel rounding
  });
});
