import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  expectUniqueNoticeCards,
  fixtureNoticeTitle,
  scopeStorageKey,
  seedResident,
  visitStorageKey,
} from "./resident-fixtures";

const newUpdates = "New since your last visit";

test("Today has a resident briefing, distinct shelves and no repeated notice cards", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Today in Paris", exact: true }),
  ).toBeVisible();
  for (const name of [
    newUpdates,
    "Changes around you",
    "Things to do",
    "Local openings",
    "Around the neighbourhood",
  ]) {
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  }
  const area = page.getByRole("region", { name: "Your feed area" });
  await expect(area).toContainText("Exploring all Paris");
  await expect(
    area.getByRole("link", { name: "Set my area", exact: true }),
  ).toHaveAttribute("href", "/app/area");
  await expect(area).not.toContainText(/alerts enabled|notifications enabled/i);
  await expect(page.getByRole("region", { name: newUpdates })).toContainText(
    "Your first look around",
  );
  await expect(
    page.getByRole("region", { name: newUpdates }).locator(".notice-card"),
  ).toHaveCount(0);
  await expect(page.locator(".notice-card").first()).toBeVisible();
  await expectUniqueNoticeCards(page);
  await expect(page.locator(".demo-banner")).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("neighbourhood-today.png"),
    fullPage: true,
  });
});

test("the previous visit is stable during navigation and advances on a real return", async ({
  page,
}) => {
  const oldVisit = new Date(Date.now() - 14 * 86400000).toISOString();
  await seedResident(page, { lastVisit: oldVisit });
  await page.goto("/today");
  const shelf = page.getByRole("region", { name: newUpdates });
  await expect(
    shelf.getByRole("link", { name: fixtureNoticeTitle, exact: true }),
  ).toBeVisible();
  await expectUniqueNoticeCards(page);
  const checkpoint = await page.evaluate(
    (key) => localStorage.getItem(key),
    visitStorageKey,
  );
  expect(new Date(checkpoint!).getTime()).toBeGreaterThan(
    new Date(oldVisit).getTime(),
  );

  // Next client navigation must not relabel every page transition as a visit.
  await page.getByRole("button", { name: "Browse all pages" }).click();
  await page
    .getByRole("navigation", { name: "All pages" })
    .getByRole("link", { name: "Explore the map", exact: true })
    .click();
  await expect(page).toHaveURL(/\/map$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/today$/);
  await expect(
    shelf.getByRole("link", { name: fixtureNoticeTitle, exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), visitStorageKey),
  ).toBe(checkpoint);

  await page.reload();
  await expect(shelf).toContainText(
    "No newly published or source-updated notices",
  );
  await expect(shelf.locator(".notice-card")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: fixtureNoticeTitle, exact: true }),
  ).toBeVisible();
  await expectUniqueNoticeCards(page);
});

test("a newer verification check alone does not make an old notice new", async ({
  page,
}) => {
  // The relative fixture was published six days ago and checked more recently.
  // Its source publication/update time, not verified_at, must drive this shelf.
  await seedResident(page, {
    lastVisit: new Date(Date.now() - 3 * 86400000).toISOString(),
  });
  await page.goto("/today");
  await expect(page.getByRole("region", { name: newUpdates })).toContainText(
    "No newly published or source-updated notices",
  );
  await expect(
    page.getByRole("region", { name: newUpdates }).locator(".notice-card"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: fixtureNoticeTitle, exact: true }),
  ).toBeVisible();
  await expectUniqueNoticeCards(page);
});

for (const checkpoint of ["not-a-date", "2999-01-01T00:00:00.000Z"]) {
  test(`invalid visit checkpoint ${checkpoint} is not treated as returning history`, async ({
    page,
  }) => {
    await seedResident(page, { lastVisit: checkpoint });
    await page.goto("/today");
    await expect(page.getByRole("region", { name: newUpdates })).toBeVisible();
    await expect(
      page.getByRole("region", { name: newUpdates }).locator(".notice-card"),
    ).toHaveCount(0);
    await expect
      .poll(async () =>
        page.evaluate((key) => localStorage.getItem(key), visitStorageKey),
      )
      .not.toBe(checkpoint);
  });
}

test("the saved area and radius stay consistent on every home, feed and map route", async ({
  page,
}) => {
  await seedResident(page, { place: true, radius: 2 });
  for (const path of ["/", "/today", "/app", "/app/feed", "/map", "/app/map"]) {
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
  await page.goto("/today");
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
  for (const path of ["/app/feed", "/map", "/app", "/today"]) {
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

test("desktop navigation and the complete tools menu remain keyboard operable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/today");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation.getByRole("link")).toHaveCount(4);
  for (const name of ["Today", "Explore", "Share", "My area"]) {
    await expect(
      navigation.getByRole("link", { name, exact: true }),
    ).toBeVisible();
  }
  const toggle = page.getByRole("button", { name: "Browse all pages" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("navigation", { name: "All pages" });
  const deadline = menu.getByRole("link", {
    name: "Upcoming deadlines",
    exact: true,
  });
  await expect(deadline).toBeVisible();
  await deadline.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/deadlines$/);
  await expect(menu).not.toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/today$/);
  await expect(menu).not.toBeVisible();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(toggle).toBeFocused();
});

test("320px screens and reduced motion preserve all four resident destinations", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [path, screenshot] of [
    ["/today", "today"],
    ["/map", "explore"],
    ["/app/area", "my-area"],
    ["/share-update", "share"],
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    if (path !== "/share-update") {
      await expect(page.locator(".leaflet-container").first()).toBeVisible();
      await expect(page.locator(".leaflet-control-zoom").first()).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
    const navigation = page.getByRole("navigation", {
      name: "Mobile navigation",
    });
    for (const name of ["Today", "Explore", "Share", "My area"]) {
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
  await page.goto("/today");
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
  await page.getByRole("button", { name: "Browse all pages" }).click();
  await expectNoHorizontalOverflow(page);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Browse all pages" }),
  ).toBeFocused();
});

test("unavailable visit storage is explained without making newness claims", async ({
  page,
}) => {
  await page.addInitScript((visitKey) => {
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      if (key === visitKey)
        throw new DOMException("Storage is blocked", "SecurityError");
      return getItem.call(this, key);
    };
  }, visitStorageKey);
  await page.goto("/today");
  const shelf = page.getByRole("region", { name: newUpdates });
  await expect(shelf).toContainText(
    "Visit history is unavailable in this browser",
  );
  await expect(shelf.locator(".notice-card")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: fixtureNoticeTitle, exact: true }),
  ).toBeVisible();
  await expectUniqueNoticeCards(page);
});
