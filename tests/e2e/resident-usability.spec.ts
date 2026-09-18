import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  if (!process.env.PLAYWRIGHT_BASE_URL) {
    await page.clock.setFixedTime(new Date("2026-09-15T16:00:00Z"));
  }
});

test("notice filters announce results and reset without a reload", async ({
  page,
}) => {
  await page.goto("/today");
  const results = page.getByRole("status", { name: "Notice results" });
  await expect(results).toContainText(/Showing \d+ of \d+ notices/);
  await expect(page.locator(".notice-list .notice-card").first()).toBeVisible();
  const original = await results.innerText();
  await page
    .getByRole("searchbox", { name: "Search local updates" })
    .fill("zzzz-no-such-paris-notice");
  await expect(results).toHaveText("Showing 0 of 0 notices");
  await expect(
    page.getByRole("heading", { name: "No matching notices." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "More filters", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "More filters", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("combobox", { name: "Importance", exact: true })
    .selectOption("urgent");
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(
    page.getByRole("searchbox", { name: "Search local updates" }),
  ).toHaveValue("");
  await expect(
    page.getByRole("combobox", { name: "Importance", exact: true }),
  ).toHaveValue("all");
  await expect(
    page
      .getByRole("group", { name: "Category filters", exact: true })
      .getByRole("button", { name: "All updates", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(results).toHaveText(original);
  await expect(
    page.getByRole("button", { name: "Clear filters", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("mobile menu exposes resident destinations and closes on navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today");
  const toggle = page.getByRole("button", { name: "Browse all pages" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  const menu = page.getByRole("navigation", { name: "All pages" });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(
    menu.getByRole("link", { name: "Today in Paris", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  for (const name of [
    "Explore the map",
    "Upcoming deadlines",
    "Storm & disruption",
    "Events & activities",
    "New to Paris",
    "Browser notifications",
  ]) {
    await expect(menu.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(toggle).toBeFocused();
  await toggle.click();
  await menu
    .getByRole("link", { name: "Upcoming deadlines", exact: true })
    .click();
  await expect(page).toHaveURL(/\/deadlines$/);
  await expect(menu).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
