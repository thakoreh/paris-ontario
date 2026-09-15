import { test, expect } from "@playwright/test";

test("returns real 404 status for invalid public paths", async ({ page }) => {
  for (const path of [
    "/this-route-does-not-exist",
    "/notice/does-not-exist",
    "/deadline/does-not-exist",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(
      page.getByRole("heading", { name: "This update isn’t here." }),
    ).toBeVisible();
  }
});
