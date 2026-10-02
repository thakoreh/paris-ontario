import { expect, test } from "@playwright/test";

test.describe("resident discovery UI", () => {
  test("homepage keeps search and resident tasks after the local briefing", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Today in Paris", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("searchbox", { name: "Search local updates" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Everyday services/ }),
    ).toHaveAttribute("href", "/services");
    await expect(
      page.getByRole("link", { name: /Keep a date in mind/ }),
    ).toHaveAttribute("href", "/deadlines");

    await page
      .getByRole("button", { name: "More filters", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Date / type", exact: true })
      .selectOption("week");
    await expect(
      page.getByRole("combobox", { name: "Date / type", exact: true }),
    ).toHaveValue("week");
  });

  test("resource hub offers bounded task shortcuts", async ({ page }) => {
    await page.goto("/paris-ontario");

    await expect(
      page.getByRole("heading", { name: "What are you looking for?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Waste & recycling", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Waste & recycling", exact: true })
      .click();
    await expect(
      page.getByRole("searchbox", { name: "Find a guide" }),
    ).toHaveValue(/waste recycling/);
    await expect(
      page.getByRole("heading", { name: /Garbage, recycling & disposal/ }),
    ).toBeVisible();
  });

  test("mobile navigation keeps map and resident tools reachable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const navigation = page.getByRole("navigation", {
      name: "Mobile navigation",
    });
    await expect(
      navigation.getByRole("link", { name: "Explore", exact: true }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "Share", exact: true }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "My area", exact: true }),
    ).toBeVisible();
    await navigation
      .getByRole("link", { name: "Explore", exact: true })
      .click();
    await expect(page).toHaveURL(/\/map$/);
  });
});
