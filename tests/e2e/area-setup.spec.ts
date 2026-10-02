import { expect, test, type Page } from "@playwright/test";
import {
  fixtureNoticeTitle,
  guestStorageKey,
  seedResident,
} from "./resident-fixtures";

async function observeNoAutomaticPush(page: Page) {
  await page.addInitScript(() => {
    const calls = { permission: 0, subscribe: 0 };
    Object.assign(window, { __setupPushCalls: calls });
    const registration = {
      pushManager: {
        getSubscription: async () => null,
        subscribe: async () => {
          calls.subscribe += 1;
          throw new Error(
            "A regression test must not create a real subscription.",
          );
        },
      },
    };
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        permission: "default",
        requestPermission: async () => {
          calls.permission += 1;
          return "denied";
        },
      },
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: function PushManager() {},
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: async () => registration,
        ready: Promise.resolve(registration),
        register: async () => registration,
      },
    });
  });
  const writes: string[] = [];
  await page.route("**/api/push{,/**}", async (route) => {
    writes.push(`${route.request().method()} ${route.request().url()}`);
    await route.abort();
  });
  return async () => {
    expect(
      await page.evaluate(
        () =>
          (
            window as unknown as {
              __setupPushCalls: { permission: number; subscribe: number };
            }
          ).__setupPushCalls,
      ),
    ).toEqual({ permission: 0, subscribe: 0 });
    expect(writes).toEqual([]);
  };
}

test("area setup goes from a confirmed place through preview and interests without opting into push", async ({
  page,
}, testInfo) => {
  const expectNoPush = await observeNoAutomaticPush(page);
  await page.route("**/api/address?**", (route) =>
    route.fulfill({ json: { suggestions: [] } }),
  );
  await page.goto("/onboarding");
  await expect(
    page.getByRole("heading", { name: "Make Paris feel local.", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Place label", { exact: true }).fill("Public landmark");
  await page
    .getByRole("textbox", { name: "Search home address", exact: true })
    .fill("Grand River Street North, Paris");
  await page
    .getByRole("checkbox", { name: "I’ve checked this map location." })
    .check();
  await page
    .getByRole("button", { name: "Save location", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Add another place", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "1 km", exact: true }).click();
  await page
    .getByRole("button", { name: "Save radius & preview", exact: true })
    .click();
  const preview = page.getByRole("region", {
    name: "See your preview",
    exact: true,
  });
  await expect(preview).toContainText("1 km around your saved places");
  await expect(
    preview.getByRole("link", { name: fixtureNoticeTitle, exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("neighbourhood-area-preview.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "1 km", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Save location", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Save radius & preview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continue to interests", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "Events", exact: true }).check();
  await page
    .getByRole("button", { name: "Save interests", exact: true })
    .click();
  const alerts = page.getByRole("region", {
    name: "Browser alerts",
    exact: true,
  });
  await expect(
    alerts.getByRole("heading", { name: "Browser notifications", exact: true }),
  ).toBeVisible();
  await expect(
    alerts.getByRole("link", {
      name: "Sign in to enable notifications",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    alerts.getByRole("button", { name: "Enable on this browser", exact: true }),
  ).toHaveCount(0);
  await expect(alerts).toContainText("not an emergency warning service");
  await expectNoPush();

  // An interrupted or repeated step retains its saved choices and cannot prompt.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Events", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Save interests", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Finish and explore", exact: true })
    .click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(
    page.getByRole("region", { name: "Your feed area" }),
  ).toContainText("Public landmark");
  await expect(
    page.getByRole("region", { name: "Your feed area" }),
  ).toContainText("1 km radius");
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    guestStorageKey,
  );
  expect(saved.locations).toHaveLength(1);
  expect(saved.preferences).toMatchObject({
    radius_km: 1,
    push_enabled: false,
  });
  expect(saved.preferences.categories_json).toContain("event");
  await expectNoPush();

  await page.goto("/app/area");
  await expect(
    page.getByRole("button", { name: "1 km", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Add another place", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("neighbourhood-my-area.png"),
    fullPage: true,
  });
});

test("Cancel discards an unfinished extra place and leaving setup discards unsaved radius changes", async ({
  page,
}) => {
  await seedResident(page, { place: true, radius: 3 });
  await page.route("**/api/address?**", (route) =>
    route.fulfill({ json: { suggestions: [] } }),
  );
  await page.goto("/app/area");
  await page
    .getByRole("button", { name: "Add another place", exact: true })
    .click();
  await page
    .getByLabel("Place label", { exact: true })
    .fill("Do not save this place");
  await page
    .getByRole("button", { name: "Cancel adding a place", exact: true })
    .click();
  await expect(page.getByLabel("Place label", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "5 km", exact: true }).click();
  await page.getByRole("link", { name: "Back to Today", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Your feed area" }),
  ).toContainText("3 km radius");
  await page.goBack();
  await expect(page).toHaveURL(/\/app\/area$/);
  await expect(
    page.getByRole("button", { name: "3 km", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Add another place", exact: true })
    .click();
  await expect(page.getByLabel("Place label", { exact: true })).toHaveValue(
    "Home",
  );
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    guestStorageKey,
  );
  expect(saved.locations).toHaveLength(1);
  expect(saved.locations[0].label).toBe("My neighbourhood");
  expect(saved.preferences.radius_km).toBe(3);
});

test("an address is optional and All Paris setup never claims a saved private place", async ({
  page,
}) => {
  const expectNoPush = await observeNoAutomaticPush(page);
  await page.goto("/app/area");
  await page
    .getByRole("button", { name: "Save radius & preview", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "See your preview", exact: true }),
  ).toContainText("Exploring all Paris");
  await page
    .getByRole("button", { name: "Continue to interests", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save interests", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Finish and explore", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Your feed area" }),
  ).toContainText("Exploring all Paris");
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    guestStorageKey,
  );
  expect(saved.locations).toHaveLength(0);
  expect(saved.preferences.push_enabled).toBe(false);
  await expectNoPush();
});
