import { expect, test } from "@playwright/test";

test("resident services search and category filters work", async ({ page }) => {
  await page.goto("/services");
  await expect(
    page.getByRole("heading", { name: "Everyday services in Paris, Ontario" }),
  ).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".service-card")).toHaveCount(8);
  await page.getByLabel("Search services").fill("trash");
  await expect(page.locator(".service-card")).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Find my collection information" }),
  ).toHaveAttribute("href", /brant.ca\/garbage/);
  await page.getByLabel("Service category").selectOption("Getting around");
  await expect(
    page.getByText("No services match those filters."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".service-card")).toHaveCount(8);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://parispulse.ca/services",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("newcomer checklist saves progress in this browser and resets", async ({
  page,
}) => {
  await page.goto("/new-to-paris");
  await expect(
    page.getByRole("heading", { name: "New to Paris, Ontario? Start here." }),
  ).toBeVisible({ timeout: 10000 });
  const check = page.getByRole("checkbox").first();
  await check.check();
  await expect(page.getByRole("status")).toContainText("1 of 6 completed");
  await page.reload();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await page.getByRole("button", { name: "Reset checklist" }).click();
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();
  await expect(page.getByRole("status")).toContainText("0 of 6 completed");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
