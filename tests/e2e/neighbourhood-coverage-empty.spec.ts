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
  await expect(page.getByRole("complementary", { name: "Source coverage" })).toContainText("Sample preview");
  await expect(page.getByRole("complementary", { name: "Source coverage" })).toContainText(
    "This preview is not live information and does not count toward production coverage.",
  );
  await expect(page.getByRole("complementary", { name: "Source coverage" })).not.toContainText(
    "Source checks are within schedule",
  );
  // The verified preview fixture carries exactly one source.
  await expect(page.locator(".source-card")).toHaveCount(1);
  await expect(page.locator(".source-card").first()).toContainText("Review status");
});

test("Explore categories hide unrelated entries and preserve official links", async ({ page }) => {
  await page.goto("/explore");
  await page.getByRole("button", { name: "River", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Paddling the Grand River ›", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Visiting Paris", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Visiting", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Plan your stay ›", exact: true })).toBeVisible();
  await expect(page.locator('main a[href="https://www.brant.ca/Visit"]').first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trails & river", exact: true })).toHaveCount(0);
});
