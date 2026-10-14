import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, fixtureNoticeTitle, scopeStorageKey, seedResident } from "./resident-fixtures";

test("Today offers essentials, search and quick tasks without removed shelves", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening), Paris/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Today essentials" }).getByRole("link")).toHaveCount(4);
  await expect(page.getByRole("navigation", { name: "Quick tasks" }).getByRole("link")).toHaveCount(4);
  await expect(page.getByRole("region", { name: "Your feed area" })).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Search Paris Pulse" }).fill("garbage");
  await expect(page).toHaveURL(/q=garbage/);
  await page.reload();
  await expect(page.getByRole("searchbox", { name: "Search Paris Pulse" })).toHaveValue("garbage");
  await expect(page.locator("main").getByRole("link", { name: /Garbage, recycling/ }).first()).toBeVisible();
});

test("the saved area and radius stay consistent on Explore and personal map routes", async ({
  page,
}) => {
  await seedResident(page, { place: true, radius: 2 });
  for (const path of ["/app/map"]) {
    await page.goto(path);
    const area = page.getByRole("region", { name: "Your feed area" });
    await expect(area).toHaveCount(1);
    await expect(area).toContainText("My neighbourhood");
    await expect(area).toContainText("2 km radius");
    await expect(area).not.toContainText("Private test address");
    await expect(
      area.getByRole("button", { name: "My area", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      area.getByRole("link", { name: "Edit area & interests", exact: true }),
    ).toHaveAttribute("href", "/app/area");
  }
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Your feed area" }),
  ).toContainText("2 km radius");
});

test("All Paris is an explicit persistent escape from a small neighbourhood radius", async ({
  page,
}, testInfo) => {
  await seedResident(page, { place: true, distant: true, radius: 0.5 });
  await page.goto("/app/map");
  const area = page.getByRole("region", { name: "Your feed area" });
  await expect(area).toContainText("0.5 km radius");
  await expect(page.locator(".notice-card")).toHaveCount(0);
  await area.getByRole("button", { name: "All Paris", exact: true }).click();
  await expect(
    page.getByRole("link", { name: fixtureNoticeTitle, exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), scopeStorageKey),
  ).toBe("all");
  for (const path of ["/app/map"]) {
    await page.goto(path);
    await expect(area).toContainText("Exploring all Paris");
    await expect(
      area.getByRole("button", { name: "All Paris", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("link", { name: fixtureNoticeTitle, exact: true }),
    ).toBeVisible();
  }
  await area.getByRole("button", { name: "My area", exact: true }).click();
  await expect(page.locator(".notice-card")).toHaveCount(0);
  await page.reload();
  await expect(area).toContainText("0.5 km radius");
  await expect(
    area.getByRole("button", { name: "My area", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: testInfo.outputPath("neighbourhood-empty-nearby.png"),
    fullPage: true,
  });
});

test("desktop profile remains keyboard operable", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const profile = page.getByRole("link", { name: "Your profile", exact: true });
  await profile.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole("heading", { name: "Your profile", exact: true })).toBeVisible();
});

test("320px screens and reduced motion preserve all four resident destinations", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [path, screenshot] of [
    ["/", "today"],
    ["/explore", "explore"],
    ["/app/area", "my-area"],
    ["/share-update", "share"],
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    if (path === "/explore") await page.getByRole("button", { name: /Open map/ }).click();
    if (path === "/explore" || path === "/app/area") {
      await expect(page.locator(".leaflet-container").first()).toBeVisible();
      await expect(page.locator(".leaflet-control-zoom").first()).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
    const navigation = page.getByRole("navigation", {
      name: "Mobile navigation",
    });
    for (const name of ["Today", "Events", "Explore", "Services"]) {
      await expect(
        navigation.getByRole("link", { name, exact: true }),
      ).toBeVisible();
    }
    await page.screenshot({
      path: testInfo.outputPath(`neighbourhood-${screenshot}-320px.png`),
      fullPage: true,
      animations: "disabled",
    });
  }
  await page.goto("/app/map");
  await expect(page.locator(".notice-card").first()).toBeVisible();
  expect(
    await page
      .locator(".notice-summary")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(14);
  for (const control of await page.locator(".topbar .button:visible").all()) {
    const bounds = (await control.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("link", { name: "Your profile", exact: true }).click();
  await expectNoHorizontalOverflow(page);
});
