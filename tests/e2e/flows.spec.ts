import { test, expect } from "@playwright/test";
test("public notices, filters, map and source links", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/today");
  await expect(
    page.getByRole("heading", { name: "Today in Paris", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".demo-banner")).toHaveCount(0);
  const firstTitle = await page.locator(".notice-title").first().innerText();
  await page
    .getByRole("searchbox", { name: "Search local updates" })
    .fill(firstTitle.split(" ")[0]);
  await expect(page.locator(".notice-card").first()).toBeVisible();
  await page.locator(".notice-title").first().click();
  await expect(page.locator(".sample-callout")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Open original source" }),
  ).toHaveAttribute("href", /^https:\/\//);
  await page.goto("/map");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
  expect(errors).toEqual([]);
});
test("guest preferences, saved notices and reminders persist without sign-in", async ({
  page,
}) => {
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Your neighbourhood, in focus." }),
  ).toBeVisible();
  await page.locator(".notice-card .bookmark").first().click();
  await page.goto("/app/saved");
  await expect(page.locator(".notice-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".notice-card")).toHaveCount(1);
  await page.goto("/app/alerts");
  await page.getByRole("button", { name: "500 m", exact: true }).click();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "500 m", exact: true }),
  ).toHaveClass(/selected/);
  await page.goto("/deadlines");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add to calendar" }).first().click();
  expect((await download).suggestedFilename()).toMatch(/\.ics$/);
  await page
    .getByRole("button", { name: "Remind me", exact: true })
    .first()
    .click();
  await expect(page.getByRole("status")).toContainText("Reminder saved");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Update reminder" }),
  ).toBeVisible();
});
test("manual location and access protection", async ({ page, request }) => {
  await page.goto("/app/locations");
  await page.goto("/app/locations/new");
  await page.getByLabel("Place label").fill("Test Home");
  await page
    .getByRole("textbox", { name: "Search home address" })
    .fill("10 Grand River Street North");
  await page.getByLabel("I’ve checked this map location.").check();
  await page
    .getByRole("button", { name: "Save location", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Test Home", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Test Home", exact: true }),
  ).toBeVisible();
  expect(
    (
      await request.post("/api/admin", { data: { table: "notices", data: {} } })
    ).status(),
  ).toBe(403);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Editor access required" }),
  ).toBeVisible();
});
test("major routes and mobile layout", async ({ page }) => {
  for (const path of [
    "/",
    "/storm",
    "/deadlines",
    "/events",
    "/sources",
    "/about",
    "/disclaimer",
    "/login",
    "/signup",
    "/forgot-password",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      path,
    ).toBe(true);
  }
  await page.goto("/storm");
  await expect(
    page.getByText(
      "For emergencies, call 911 and follow official emergency authorities.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText("Linked external tool")).toHaveCount(3);
});

test("sign-in is optional and guest data can be cleared", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Continue without signing in" }).click();
  await expect(
    page.getByRole("heading", { name: "Your neighbourhood, in focus." }),
  ).toBeVisible();
  await page.locator(".notice-card .bookmark").first().click();
  await page.goto("/app/settings");
  await expect(
    page.getByRole("link", { name: "Sign in (optional)" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear browser data" }).click();
  await page.goto("/app/saved");
  await expect(
    page.getByRole("heading", { name: "Your saved notices." }),
  ).toBeVisible();
  await expect(page.locator(".notice-card")).toHaveCount(0);
});
