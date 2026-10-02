import { expect, type Page } from "@playwright/test";
import { community, defaultPreferences } from "../../src/config/community";

export const fixtureNoticeTitle =
  "Street lighting installation on Powerline Road";
export const guestStorageKey = "paris-pulse-guest";
export const visitStorageKey = "paris-pulse-last-visit:guest";
export const scopeStorageKey = "paris-pulse-area-scope";

/** Seed this isolated browser once, so reloads actually test persistence. */
export async function seedResident(
  page: Page,
  options: {
    place?: boolean;
    distant?: boolean;
    radius?: number;
    scope?: "all" | "nearby";
    lastVisit?: string;
  } = {},
) {
  await page.addInitScript(
    ({ options, preferences, communityId, guestKey, visitKey, scopeKey }) => {
      if (sessionStorage.getItem("resident-fixture-installed")) return;
      sessionStorage.setItem("resident-fixture-installed", "true");
      localStorage.setItem(
        guestKey,
        JSON.stringify({
          profile: null,
          preferences: { ...preferences, radius_km: options.radius ?? 2 },
          locations: options.place
            ? [
                {
                  id: "guest-fixture-place",
                  user_id: "guest",
                  community_id: communityId,
                  label: "My neighbourhood",
                  address_line: "Private test address",
                  city: "Paris",
                  province: "Ontario",
                  postal_code: "",
                  latitude: options.distant ? 43.22 : 43.1945,
                  longitude: -80.3844,
                  location_type: "home",
                  is_primary: true,
                },
              ]
            : [],
          saved: [],
          read: [],
          dismissed: [],
          reminders: [],
        }),
      );
      if (options.lastVisit) localStorage.setItem(visitKey, options.lastVisit);
      if (options.scope) localStorage.setItem(scopeKey, options.scope);
    },
    {
      options,
      preferences: defaultPreferences,
      communityId: community.id,
      guestKey: guestStorageKey,
      visitKey: visitStorageKey,
      scopeKey: scopeStorageKey,
    },
  );
}

export async function expectNoHorizontalOverflow(page: Page) {
  const width = page.viewportSize()!.width;
  const layout = await page.evaluate(
    (viewportWidth) => ({
      scrollWidth: document.documentElement.scrollWidth,
      overflowing: [...document.querySelectorAll("body *")]
        .filter((element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return (
            box.width > 0 &&
            style.visibility !== "hidden" &&
            (box.right > viewportWidth + 1 || box.left < -1) &&
            !element.closest(".leaflet-container")
          );
        })
        .slice(0, 12)
        .map((element) => ({
          tag: element.tagName,
          className: element.className,
        })),
    }),
    width,
  );
  // innerWidth can grow with overflowing content on an emulated mobile browser.
  expect(layout.scrollWidth, JSON.stringify(layout)).toBeLessThanOrEqual(width);
}

export async function expectUniqueNoticeCards(page: Page) {
  const links = await page
    .locator(".notice-card .notice-title")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  expect(links.length).toBeGreaterThan(0);
  expect(links.every(Boolean)).toBe(true);
  expect(
    new Set(links).size,
    `Repeated notice links: ${links.join(", ")}`,
  ).toBe(links.length);
}
