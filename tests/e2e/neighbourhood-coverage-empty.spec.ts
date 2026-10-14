import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./resident-fixtures";

test("source coverage stays on Sources and public pages hide empty shelves", async ({ page }) => {
  for (const route of ["/", "/events", "/explore", "/services"]) {
    await page.goto(route);
    await expect(page.getByRole("complementary", { name: "Source coverage" })).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("Source coverage needs attention");
    await expect(page.locator("main")).not.toContainText("Showing 0 of 0");
    await expectNoHorizontalOverflow(page);
  }
  await page.goto("/sources");
  await expect(page.getByRole("complementary", { name: "Source coverage" })).toBeVisible();
});

test("Explore categories hide unrelated entries and preserve official links", async ({ page }) => {
  await page.goto("/explore");
  await page.getByRole("button", { name: "River", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Paddling the Grand River", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Visiting Paris", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Visiting", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Plan your stay", exact: true })).toBeVisible();
  await expect(page.locator('main a[href="https://www.brant.ca/Visit"]').first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trails & river", exact: true })).toHaveCount(0);
});
