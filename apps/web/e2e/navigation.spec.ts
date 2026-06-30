import { test, expect } from "@playwright/test";

test.describe("Moderation app navigation", () => {
  test("should display the new-scan page", async ({ page }) => {
    await page.goto("/jobs/new");
    await expect(page).toHaveURL(/jobs\/new/);
  });

  test("should display the review queue", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page).toHaveURL(/jobs/);
  });

  test("should navigate to files page", async ({ page }) => {
    await page.goto("/files");
    await expect(page).toHaveURL(/files/);
  });

  test("should display the dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });
});
