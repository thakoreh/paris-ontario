import { test, expect, type Page } from "@playwright/test";
import { defaultPreferences } from "../../src/config/community";

async function observePushWithoutSending(
  page: Page,
  existingSubscription = false,
) {
  await page.addInitScript(
    ({ existingSubscription }) => {
      const calls = { permission: 0, subscribe: 0, unsubscribe: 0 };
      Object.assign(window, { __pushCalls: calls });
      const subscription = {
        endpoint: "https://fcm.googleapis.com/fcm/send/local-test-only",
        unsubscribe: async () => {
          calls.unsubscribe += 1;
          return true;
        },
      };
      const registration = {
        pushManager: {
          getSubscription: async () =>
            existingSubscription ? subscription : null,
          subscribe: async () => {
            calls.subscribe += 1;
            throw new Error(
              "No real browser subscription is permitted in this test.",
            );
          },
        },
      };
      Object.defineProperty(window, "Notification", {
        configurable: true,
        value: {
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
    },
    { existingSubscription },
  );
  const requests: string[] = [];
  await page.route("**/api/push{,/**}", async (route) => {
    requests.push(`${route.request().method()} ${route.request().url()}`);
    await route.abort();
  });
  return requests;
}

async function expectNoOptIn(page: Page) {
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as {
            __pushCalls: { permission: number; subscribe: number };
          }
        ).__pushCalls,
    ),
  ).toMatchObject({ permission: 0, subscribe: 0 });
}

test("push is opt-in and explains personalized matching, sign-in and delivery limits", async ({
  page,
}) => {
  const requests = await observePushWithoutSending(page);
  await page.goto("/notifications");
  await expect(
    page.getByRole("heading", { name: "Browser notifications" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in to enable notifications" }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByText(/not an emergency warning service/),
  ).toBeVisible();
  await expect(
    page.getByText(
      /notices that match your saved places, radius, interests and minimum importance/,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(/publishing one does not automatically send an alert/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enable on this browser" }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/community-wide alerts, not personalized/),
  ).toHaveCount(0);
  await expectNoOptIn(page);
  expect(requests).toEqual([]);
});

test("a guest with no saved place cannot enable delivery through browser preferences", async ({
  page,
}) => {
  const requests = await observePushWithoutSending(page);
  await page.addInitScript((preferences) => {
    localStorage.setItem(
      "paris-pulse-guest",
      JSON.stringify({
        locations: [],
        preferences: { ...preferences, push_enabled: true },
      }),
    );
  }, defaultPreferences);
  await page.goto("/notifications");
  await expect(
    page.getByText(
      "Add a saved place to your account before enabling notifications.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText(/Guest places and preferences stay in this browser/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enable on this browser" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Manage alert preferences" }),
  ).toHaveAttribute("href", "/app/alerts");
  await expectNoOptIn(page);
  expect(requests).toEqual([]);
});

test("a signed-out resident can disable an existing browser subscription without opting in", async ({
  page,
}) => {
  const requests = await observePushWithoutSending(page, true);
  await page.goto("/notifications");
  await expect(
    page.getByRole("link", { name: "Sign in to enable notifications" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send test notification" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Disable on this browser" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Notifications disabled on this browser." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Disable on this browser" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __pushCalls: { unsubscribe: number } })
          .__pushCalls.unsubscribe,
    ),
  ).toBe(1);
  await expectNoOptIn(page);
  expect(requests).toEqual([]);
});

test("guest settings cannot enable delivery or prompt for browser permission", async ({
  page,
}) => {
  const requests = await observePushWithoutSending(page);
  await page.goto("/app/alerts");
  const push = page.getByRole("switch", { name: /^Push notifications/ });
  await expect(push).not.toBeChecked();
  await expect(push).toBeDisabled();
  await expect(
    page.getByText(
      /Master delivery preference for all your subscribed devices/,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Set up browser notifications" }),
  ).toHaveAttribute("href", "/notifications");
  await expect(
    page.getByText(/Quiet hours use Paris, Ontario time \(America\/Toronto\)/),
  ).toBeVisible();
  await expect(
    page.getByText(/matching start and end times pause delivery all day/),
  ).toBeVisible();
  await expect(page.getByText(/Browser push is not enabled/)).toHaveCount(0);
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expectNoOptIn(page);
  expect(requests).toEqual([]);
});

test("a stale saved guest Push preference can be turned off and stays off", async ({
  page,
}) => {
  const requests = await observePushWithoutSending(page);
  await page.goto("/app/alerts");
  await page.evaluate((preferences) => {
    localStorage.setItem(
      "paris-pulse-guest",
      JSON.stringify({
        locations: [],
        preferences: { ...preferences, push_enabled: true },
      }),
    );
  }, defaultPreferences);
  await page.reload();
  const push = page.getByRole("switch", { name: /^Push notifications/ });
  await expect(push).toBeChecked();
  await push.uncheck();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your preferences are saved.",
  );
  await page.reload();
  await expect(push).not.toBeChecked();
  await expect(push).toBeDisabled();
  await expectNoOptIn(page);
  expect(requests).toEqual([]);
});

test("privacy and disclaimer describe the same personalized push contract", async ({
  page,
}) => {
  await page.goto("/privacy");
  await expect(
    page.getByText(/verified notices that match your saved places, radius/),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Turning off Push in Settings stops future sends to all your devices/,
    ),
  ).toBeVisible();
  await expect(page.getByText(/verified community-wide notices/)).toHaveCount(
    0,
  );
  await page.goto("/disclaimer");
  await expect(
    page.getByText(
      /Opt-in browser notifications deliver editor-selected verified notices/,
    ),
  ).toBeVisible();
  await expect(page.getByText(/push delivery are not yet enabled/)).toHaveCount(
    0,
  );
});
