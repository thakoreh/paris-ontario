import { expect, test } from "@playwright/test";

for (const route of [
  "/",
  "/events",
  "/explore",
  "/services",
  "/explore/trails",
  "/explore/visiting",
  "/services/council",
]) {
  test(`${route} keeps its description in the HTML head and loads resources`, async ({
    page,
  }) => {
    const missing: string[] = [];
    page.on("response", (response) => {
      if (response.status() === 404) missing.push(response.url());
    });
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    const html = await response!.text();
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
    expect(head).toMatch(/<meta\s+name="description"\s+content="[^"]+"/);
    await expect(page.locator("head meta[name=description]")).toHaveCount(1);
    // Include link prefetches, the source of the original console 404s.
    await page.waitForLoadState("networkidle");
    expect(missing).toEqual([]);
  });
}

test("Explore keeps mobile chips on one row beside a compact map hero", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/explore");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  const title = page.getByRole("heading", {
    name: "Explore Paris",
    exact: true,
  });
  await expect(title).toHaveCSS("font-size", "28px");
  const chips = page.locator(".explore-chips");
  const tops = await chips
    .locator("button")
    .evaluateAll((buttons) =>
      buttons.map((b) => Math.round(b.getBoundingClientRect().top)),
    );
  expect(new Set(tops).size).toBe(1);
  await expect(chips).toHaveCSS("overflow-x", "auto");
  const trailLefts = await page
    .locator(".explore-trails > *")
    .evaluateAll((rows) => rows.map((r) => Math.round(r.getBoundingClientRect().left)));
  expect(new Set(trailLefts).size).toBe(1);
  const hero = await page.locator(".explore-map-card").boundingBox();
  const chipBox = await chips.boundingBox();
  expect(hero!.y - (chipBox!.y + chipBox!.height)).toBeLessThanOrEqual(24);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test("Today has a main column and Explore rail at 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const main = await page.locator(".today-main").boundingBox();
  const rail = await page.locator(".today-explore").boundingBox();
  expect(rail!.x).toBeGreaterThan(main!.x + main!.width);
  expect(main!.width / rail!.width).toBeCloseTo(2, 1);
  await expect(page.locator(".today-page h1")).toHaveCSS("font-size", "36px");
  await expect(page.getByText("Friday weekend email")).toHaveCount(0);
});
