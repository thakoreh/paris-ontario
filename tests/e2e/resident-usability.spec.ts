import { expect, test } from "@playwright/test";

test("notice filters announce results and reset without a reload", async ({
  page,
}) => {
  await page.goto("/app/map");
  const results = page.getByRole("status", { name: "Notice results" });
  await expect(results).toContainText(/Showing \d+ of \d+ notices/);
  await expect(page.locator(".notice-list .notice-card").first()).toBeVisible();
  const original = await results.innerText();
  await page
    .getByRole("searchbox", { name: "Search local updates" })
    .fill("zzzz-no-such-paris-notice");
  await expect(results).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "No matching notices." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "More filters", exact: true }).click();
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

test("mobile profile keeps sign-in and sharing reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("link", { name: "Your profile", exact: true }).click();
  await expect(page.locator("main").getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: "Share an update", exact: true })).toBeVisible();
});

test("Explore preserves filters across List and Map and links a selected notice to its marker", async ({
  page,
}, testInfo) => {
  await page.goto("/app/map");
  await expect(
    page.getByRole("heading", {
      name: "Explore your neighbourhood",
      exact: true,
    }),
  ).toBeVisible();
  const view = page.getByRole("group", { name: "Explore view", exact: true });
  await view.getByRole("button", { name: "List", exact: true }).click();
  const search = page.getByRole("searchbox", {
    name: "Search local updates",
    exact: true,
  });
  await search.fill("Powerline");
  await expect(page.locator(".notice-list .notice-card")).toHaveCount(1);
  const title = await page.locator(".notice-title").innerText();
  await view.getByRole("button", { name: "Map", exact: true }).click();
  await expect(
    view.getByRole("button", { name: "Map", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByRole("region", { name: "Map view", exact: true })
      .locator(".leaflet-container"),
  ).toBeVisible();
  await expect(search).toHaveValue("Powerline");
  await page
    .getByRole("button", { name: `Show ${title} on map`, exact: true })
    .click();
  await expect(page.locator(".map-selected-notice .notice-title")).toHaveText(
    title,
  );
  await expect(
    page
      .locator(".leaflet-popup-content")
      .getByRole("link", { name: title, exact: true }),
  ).toBeVisible();
  await expect(page.locator(".leaflet-popup")).toHaveCSS("opacity", "1");
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("neighbourhood-explore-map.png"),
    fullPage: true,
  });
  await view.getByRole("button", { name: "List", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Map view", exact: true }),
  ).toHaveCount(0);
  await expect(search).toHaveValue("Powerline");
  await expect(page.locator(".notice-list .notice-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(search).toHaveValue("");
  await page
    .getByRole("group", { name: "Category filters", exact: true })
    .getByRole("button", { name: "Events", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No matching notices.", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.locator(".notice-list .notice-card")).toHaveCount(1);
});
