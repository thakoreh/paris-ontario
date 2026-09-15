import { test, expect } from "@playwright/test";

test("push is opt-in and explains sign-in and delivery limits", async ({ page }) => {
  await page.goto("/notifications");
  await expect(page.getByRole("heading", { name: "Browser notifications" })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("link", { name: "Sign in to enable notifications" })).toBeVisible();
  await expect(page.getByRole("main").getByText(/not an emergency warning service/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Enable on this browser" })).toHaveCount(0);
});
