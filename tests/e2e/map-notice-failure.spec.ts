import { expect, test } from "@playwright/test";
import sources from "../../public/data/explore/sources.json";

test("County map stays available when notices fail and Retry recovers markers", async ({ page }) => {
  await page.route("**/api/explore", (route) => route.abort());
  await page.goto("/explore");
  await page.getByRole("button", { name: /Open map/ }).click();

  const map = page.locator(".leaflet-container");
  const error = page.getByRole("status").filter({ hasText: "Notices couldn't load. County layers are still shown." });
  await expect(map).toBeVisible();
  await expect(page.locator(".leaflet-control-layers")).toBeVisible();
  await expect(error).toBeVisible();
  await expect(page.locator(".pulse-marker, .marker-cluster")).toHaveCount(0);

  // Load the shipped County geometry while the notices endpoint is unavailable.
  const layerResponse = page.waitForResponse((response) =>
    response.url().endsWith(sources[0].path) && response.ok(),
  );
  await page.getByLabel(sources[0].name, { exact: true }).check();
  await layerResponse;
  await expect(map.locator(".leaflet-overlay-pane path").first()).toBeVisible();

  await page.unroute("**/api/explore");
  const recoveredResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/explore" && response.ok(),
  );
  await error.getByRole("button", { name: "Retry", exact: true }).click();
  const response = await recoveredResponse;
  const { notices } = await response.json();
  expect(notices.some((notice: { latitude: number | null; longitude: number | null }) =>
    notice.latitude !== null && notice.longitude !== null,
  )).toBe(true);
  await expect(error).toHaveCount(0);
  await expect(page.locator(".pulse-marker, .marker-cluster").first()).toBeVisible();
  await expect(map).toBeVisible();
});
