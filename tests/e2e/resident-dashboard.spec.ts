import { expect, test } from "@playwright/test";
import { defaultPreferences, community } from "../../src/config/community";

test("the dashboard leads with real feed content before discovery tools", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const lead = page.locator(".briefing-lead .notice-card");
  await expect(lead).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "This weekend", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Roads & disruptions", exact: true }),
  ).toBeVisible();
  const content = await lead.boundingBox();
  const search = await page
    .getByRole("searchbox", { name: "Search local updates" })
    .boundingBox();
  expect(content!.y).toBeLessThan(search!.y);
  expect(content!.y).toBeLessThan(page.viewportSize()!.height);
  await expect(
    page.getByRole("link", { name: "Set my area", exact: true }),
  ).toHaveAttribute("href", "/onboarding");
  await expect(page.getByLabel("Your feed area")).toContainText(
    "Exploring all Paris",
  );
  await expect(page.getByLabel("Your feed area")).toContainText(
    "Check this device",
  );
  await expect(page.locator(".overview-strip")).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("resident-dashboard.png"),
    fullPage: true,
  });
});

test("returning guests get their actual saved label and radius, without claiming push delivery", async ({
  page,
}) => {
  await page.addInitScript(
    ({ preferences, communityId }) => {
      localStorage.setItem(
        "paris-pulse-guest",
        JSON.stringify({
          profile: null,
          preferences: { ...preferences, radius_km: 2 },
          locations: [
            {
              id: "guest-place",
              user_id: "guest",
              community_id: communityId,
              label: "My neighbourhood",
              address_line: "Private test address",
              city: "Paris",
              province: "Ontario",
              postal_code: "",
              latitude: 43.1945,
              longitude: -80.3844,
              location_type: "home",
              is_primary: true,
            },
          ],
          saved: [],
          read: [],
          dismissed: [],
          reminders: [],
        }),
      );
    },
    { preferences: defaultPreferences, communityId: community.id },
  );
  await page.goto("/");
  const area = page.getByLabel("Your feed area");
  await expect(area).toContainText("Near My neighbourhood");
  await expect(area).toContainText("2 km radius");
  await expect(area).not.toContainText("Private test address");
  await expect(area).not.toContainText(/alerts enabled|notifications enabled/i);
  await expect(
    page.getByRole("link", { name: "Manage my area", exact: true }),
  ).toHaveAttribute("href", "/app/locations");
  await page.reload();
  await expect(area).toContainText("Near My neighbourhood");
});

test("desktop secondary navigation remains reachable and keyboard operable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/today");
  const sidebar = page.locator(".sidebar");
  await expect(
    sidebar
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link"),
  ).toHaveCount(5);
  const tools = sidebar
    .locator("summary")
    .filter({ hasText: "More local tools" });
  await tools.focus();
  await page.keyboard.press("Enter");
  await expect(
    sidebar.getByRole("link", { name: "Upcoming deadlines", exact: true }),
  ).toBeVisible();
  await sidebar
    .getByRole("link", { name: "Upcoming deadlines", exact: true })
    .click();
  await expect(page).toHaveURL(/\/deadlines$/);
});

test("narrow screens and reduced motion keep the briefing readable", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".briefing-lead .notice-card")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".notice-summary")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(14);
  expect(
    await page
      .locator(".resident-shortcuts a")
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
  await page.screenshot({
    path: testInfo.outputPath("resident-dashboard-320px.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Browse all pages" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Browse all pages" }),
  ).toBeFocused();
});
