import { expect, test } from "@playwright/test";

test.describe("mobile navigation regressions", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("all-pages menu marks the feed alias as current", async ({ page }) => {
    await page.goto("/app/feed");

    await page.getByRole("button", { name: "Browse all pages" }).click();

    await expect(
      page.getByRole("navigation", { name: "All pages" }).getByRole("link", {
        name: "Today in Paris",
      }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("all-pages menu marks the map alias as current", async ({ page }) => {
    await page.goto("/app/map");

    await page.getByRole("button", { name: "Browse all pages" }).click();

    await expect(
      page.getByRole("navigation", { name: "All pages" }).getByRole("link", {
        name: "Explore the map",
      }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("personal mobile Home stays on /app and is current there", async ({ page }) => {
    await page.goto("/app");

    const home = page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Home", exact: true });
    await expect(home).toHaveAttribute("href", "/app");
    await expect(home).toHaveAttribute("aria-current", "page");

    await home.click({ force: true });
    await expect(page).toHaveURL(/\/app$/);
  });

  test("anonymous mobile Home remains /", async ({ page }) => {
    await page.goto("/");

    const home = page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Home", exact: true });
    await expect(home).toHaveAttribute("href", "/");
    await expect(home).toHaveAttribute("aria-current", "page");
  });
});
