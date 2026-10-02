import { expect, test } from "@playwright/test";

test.describe("mobile navigation regressions", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("all-pages menu marks the Explore list as current", async ({ page }) => {
    await page.goto("/app/feed");

    await page.getByRole("button", { name: "Browse all pages" }).click();

    await expect(
      page.getByRole("navigation", { name: "All pages" }).getByRole("link", {
        name: "Explore the list",
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

  test("personal Today navigates to the shared local briefing and remains current", async ({
    page,
  }) => {
    await page.goto("/app");

    const home = page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Today", exact: true });
    await expect(home).toHaveAttribute("href", "/today");
    await expect(home).toHaveAttribute("aria-current", "page");

    await home.click();
    await expect(page).toHaveURL(/\/today$/);
  });

  test("anonymous Today navigates to the same shared local briefing", async ({
    page,
  }) => {
    await page.goto("/");

    const home = page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Today", exact: true });
    await expect(home).toHaveAttribute("href", "/today");
    await expect(home).toHaveAttribute("aria-current", "page");
  });
});

test("the four mobile destinations remain correct after repeat visits and browser Back/Forward", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today");
  const navigation = page.getByRole("navigation", {
    name: "Mobile navigation",
    exact: true,
  });
  for (const [name, path] of [
    ["Explore", "/map"],
    ["Share", "/share-update"],
    ["My area", "/app/area"],
    ["Today", "/today"],
  ]) {
    const destination = navigation.getByRole("link", { name, exact: true });
    await destination.click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(destination).toHaveAttribute("aria-current", "page");
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator("main h1")).toBeVisible();
  }
  await page.goBack();
  await expect(page).toHaveURL(/\/app\/area$/);
  await expect(
    navigation.getByRole("link", { name: "My area", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goForward();
  await expect(page).toHaveURL(/\/today$/);
  await expect(
    navigation.getByRole("link", { name: "Today", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("button", { name: "Browse all pages", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "All pages", exact: true })
    .getByRole("link", { name: "Today in Paris", exact: true })
    .click();
  await expect(
    page.getByRole("navigation", { name: "All pages", exact: true }),
  ).not.toBeVisible();
  await expect(page).toHaveURL(/\/today$/);
});
