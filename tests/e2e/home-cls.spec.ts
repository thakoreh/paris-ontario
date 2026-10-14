import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("home first paint keeps the feed and footer stable", async ({ page }) => {
  await page.addInitScript(() => {
    const metrics = { cls: 0, footerTop: null as number | null };
    Object.assign(window, { homeLayoutMetrics: metrics });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        };
        if (!shift.hadRecentInput) metrics.cls += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    document.addEventListener("DOMContentLoaded", () => {
      const footer = document.querySelector("footer");
      metrics.footerTop = footer
        ? footer.getBoundingClientRect().top + window.scrollY
        : null;
    }, { once: true });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  // Let buffered entries from the final paint reach the observer.
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  const result = await page.evaluate(() => {
    const metrics = (window as Window & {
      homeLayoutMetrics?: { cls: number; footerTop: number | null };
    }).homeLayoutMetrics!;
    return {
      ...metrics,
      finalFooterTop: document.querySelector("footer")!.getBoundingClientRect().top + window.scrollY,
    };
  });
  expect(result.footerTop).not.toBeNull();
  expect(result.finalFooterTop).toBe(result.footerTop);
  expect(result.cls).toBeLessThan(0.1);
});
