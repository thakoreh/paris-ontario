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
  const chipBox = await chips.boundingBox();
  const chipBounds = await chips.locator("button").evaluateAll((buttons) =>
    buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return { right: rect.right, height: rect.height, width: rect.width };
    }),
  );
  expect(chipBounds).toHaveLength(5);
  expect(chipBounds.at(-1)!.right).toBeLessThanOrEqual(chipBox!.x + chipBox!.width);
  for (const chip of chipBounds) {
    expect(chip.height).toBeGreaterThanOrEqual(44);
    expect(chip.width).toBeGreaterThanOrEqual(44);
  }
  const trailTitles = await page.locator(".explore-trails h3").evaluateAll((titles) =>
    titles.map((title) => {
      const style = getComputedStyle(title);
      return { weight: parseFloat(style.fontWeight), size: parseFloat(style.fontSize) };
    }),
  );
  expect(trailTitles.length).toBeGreaterThan(0);
  for (const title of trailTitles) {
    expect(title.weight).toBeGreaterThanOrEqual(600);
    expect(title.size).toBeGreaterThanOrEqual(15);
  }
  const trailLefts = await page
    .locator(".explore-trails > *")
    .evaluateAll((rows) => rows.map((r) => Math.round(r.getBoundingClientRect().left)));
  expect(new Set(trailLefts).size).toBe(1);
  const hero = await page.locator(".explore-map-card").boundingBox();
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

test("Trails subpage lists trails as full-width rows at 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/explore/trails");
  const lefts = await page
    .locator(".explore-trails > *")
    .evaluateAll((rows) => rows.map((r) => Math.round(r.getBoundingClientRect().left)));
  expect(lefts.length).toBeGreaterThan(1);
  expect(new Set(lefts).size).toBe(1);
});
