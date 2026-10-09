import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  expectUniqueNoticeCards,
  fixtureNoticeTitle,
  scopeStorageKey,
  seedResident,
} from "./resident-fixtures";

test("Today exposes sample source coverage without replacing the update shelves", async ({
  page,
}) => {
  await page.goto("/today");

  const coverage = page.getByRole("complementary", { name: "Source coverage" });
  await expect(coverage).toContainText("Sample preview");
  await expect(coverage).toContainText(
    "This preview is not live information and does not count toward production coverage.",
  );
  await expect(coverage).not.toContainText("Source checks are within schedule");
  await expect(
    coverage.getByRole("link", { name: "Review source coverage", exact: true }),
  ).toHaveAttribute("href", "/sources");
  await expect(page.getByRole("heading", { name: "Things to do", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Local openings", exact: true })).toBeVisible();
  await expectUniqueNoticeCards(page);
});

test("empty Today shelves provide direct actions and avoid a redundant All Paris prompt", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/today");

  const events = page.locator(".section-event");
  await expect(events).not.toContainText("Try All Paris");
  await expect(
    events.getByRole("link", { name: "Check Services", exact: true }),
  ).toHaveAttribute("href", "/services");
  await expect(
    page
      .locator(".section-business")
      .getByRole("link", { name: "Share a source", exact: true }),
  ).toHaveAttribute("href", "/share-update");
  await expect(
    page
      .locator(".section-community")
      .getByRole("link", { name: "Review sources", exact: true }),
  ).toHaveAttribute("href", "/sources");
  const services = events.getByRole("link", {
    name: "Check Services",
    exact: true,
  });
  await services.focus();
  await expect(services).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/services$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/today$/);
  await expectNoHorizontalOverflow(page);

  for (const action of await page.locator(".section-empty-actions a").all()) {
    await expect(action).toBeVisible();
    expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(36);
  }
});

test("an empty nearby shelf can use the existing All Paris scope state", async ({
  page,
}) => {
  await seedResident(page, { place: true, distant: true, radius: 0.5 });
  await page.goto("/today");

  const events = page.locator(".section-event");
  await expect(events.getByRole("button", { name: "View all Paris", exact: true })).toBeVisible();
  await events.getByRole("button", { name: "View all Paris", exact: true }).click();
  await expect(page.getByRole("region", { name: "Your feed area" })).toContainText(
    "Exploring all Paris",
  );
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), scopeStorageKey))
    .toBe("all");
  await expect(page.getByRole("link", { name: fixtureNoticeTitle, exact: true })).toBeVisible();
  await expectUniqueNoticeCards(page);
});

test("Invite a neighbour shares the canonical public Today link", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "__sharedUrl", { value: "", writable: true });
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (url: string) => {
          (window as Window & { __sharedUrl?: string }).__sharedUrl = url;
        },
      },
    });
  });
  await page.goto("/today");

  const invite = page.locator(".neighbourhood-invite");
  await expect(invite).toContainText("Invite a neighbour");
  await invite.getByRole("button", { name: "Share", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __sharedUrl?: string }).__sharedUrl))
    .toBe("https://parispulse.ca/today");
});
