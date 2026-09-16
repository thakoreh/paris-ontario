import { expect, test } from "@playwright/test";

test.describe("resident discovery UI", () => {
  test("homepage leads with search and resident tasks", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "What do you need today?" }),
    ).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search local updates" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Find a service/ })).toHaveAttribute(
      "href",
      "/services",
    );
    await expect(
      page.getByRole("link", { name: /Check upcoming deadlines/ }),
    ).toHaveAttribute("href", "/deadlines");

    await page.getByRole("button", { name: "This week", exact: true }).click();
    await expect(page.getByRole("button", { name: "This week", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("resource hub offers bounded task shortcuts", async ({ page }) => {
    await page.goto("/paris-ontario");

    await expect(
      page.getByRole("heading", { name: "What are you looking for?" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Waste & recycling", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Waste & recycling", exact: true }).click();
    await expect(page.getByRole("searchbox", { name: "Find a guide" })).toHaveValue(/waste recycling/);
    await expect(page.getByRole("heading", { name: /Garbage, recycling & disposal/ })).toBeVisible();
  });

  test("mobile navigation keeps map and resident tools reachable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
    await expect(navigation.getByRole("link", { name: "Map", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Services", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Saved", exact: true })).toBeVisible();
    await navigation.getByRole("link", { name: "Map", exact: true }).click();
    await expect(page).toHaveURL(/\/map$/);
  });
});
