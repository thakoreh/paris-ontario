import { expect, test } from "@playwright/test";

const destinations = [
  ["Today", "/"],
  ["Events", "/events"],
  ["Explore", "/explore"],
  ["Services", "/services"],
] as const;

test("four destinations remain current through navigation and browser history", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https:\/\/parispulse\.ca\/?$/);
  const navigation = page.getByRole("navigation", {
    name:
      testInfo.project.name === "mobile"
        ? "Mobile navigation"
        : "Main navigation",
    exact: true,
  });
  await expect(navigation.getByRole("link")).toHaveCount(4);
  await expect(page.locator("#all-pages-menu")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Browse all pages" }),
  ).toHaveCount(0);
  for (const [name, href] of destinations) {
    const link = navigation.getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("href", href);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href === "/" ? "/" : href}$`));
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
  }
  await page.goBack();
  await expect(
    navigation.getByRole("link", { name: "Explore", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goForward();
  await expect(
    navigation.getByRole("link", { name: "Services", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

for (const [source, destination] of [
  ["/today", "/"],
  ["/app", "/"],
  ["/map", "/explore"],
  ["/app/feed", "/explore"],
]) {
  test(`${source} permanently redirects to ${destination}`, async ({
    request,
  }) => {
    const response = await request.get(`${source}?area=paris`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(301);
    expect(response.headers().location).toBe(`${destination}?area=paris`);
  });
}

test("profile is a 44px target, prompts guests to sign in, and keeps sharing available", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const profile = page.getByRole("link", { name: "Your profile", exact: true });
  const box = (await profile.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  const saved = page.locator(".header-tools .saved-entry");
  if (testInfo.project.name === "mobile") await expect(saved).toBeHidden();
  else await expect(saved).toBeVisible();
  await profile.click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(
    page.locator("main").getByRole("link", { name: "Sign in", exact: true }),
  ).toHaveAttribute("href", "/login");
  await expect(
    page
      .locator("main")
      .getByRole("link", { name: "Share an update", exact: true }),
  ).toHaveAttribute("href", "/share-update");
});

for (const route of ["/app/alerts", "/notifications"]) {
  test(`${route} contains account preferences and browser notifications`, async ({
    page,
  }) => {
    await page.goto(route);
    await expect(
      page.getByRole("heading", { name: "Alerts", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Alert preferences", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Browser notifications", exact: true }),
    ).toBeVisible();
  });
}

test("public tools remain within two taps and trust links appear once in the footer", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".primary-navigation, .mobile-nav")
    .getByRole("link", { name: "Services", exact: true })
    .filter({ visible: true })
    .click();
  for (const href of ["/deadlines", "/storm", "/new-to-paris"])
    await expect(page.locator(`main a[href="${href}"]`).first()).toBeVisible();
  await page.goto("/explore");
  await expect(page.locator('main a[href="/paris-ontario"]')).toBeVisible();
  const footer = page.locator("footer");
  await expect(footer.getByRole("link")).toHaveCount(7);
  await expect(footer.locator('a[href="/about"]')).toHaveCount(1);
});
