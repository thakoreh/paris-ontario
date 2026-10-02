import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("public pages have no WCAG A/AA automated violations", async ({
  page,
}) => {
  for (const route of [
    "/today",
    "/map",
    "/app/area",
    "/share-update",
    "/login",
    "/deadlines",
    "/storm",
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      route,
    ).toEqual([]);
  }
});
