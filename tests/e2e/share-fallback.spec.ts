import { expect, test } from "@playwright/test";

test("Share offers a selected read-only URL when native sharing and copying fail", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => { throw new DOMException("denied", "NotAllowedError"); },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => { throw new DOMException("denied", "NotAllowedError"); },
      },
    });
  });

  await page.goto("/services?utm_source=qa-share#manual");
  await page.getByRole("button", { name: "Share", exact: true }).first().click();
  const input = page.getByRole("textbox", { name: "Link to share" });
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute("readonly", "");
  await expect(input).toHaveValue("https://parispulse.ca/services");
  await expect(input).toBeFocused();
  await expect.poll(() => input.evaluate((element: HTMLInputElement) =>
    element.value.substring(element.selectionStart ?? 0, element.selectionEnd ?? 0),
  )).toBe("https://parispulse.ca/services");
});
