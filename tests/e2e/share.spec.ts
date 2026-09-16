import { expect, test } from "@playwright/test";

test("public guide sharing offers a clean selectable link when copying is denied", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException("denied", "NotAllowedError");
        },
      },
    });
  });

  await page.goto("/services?utm_source=qa-share#manual");
  const shareButton = page.getByRole("button", { name: "Share", exact: true }).first();
  await shareButton.click();

  await expect(shareButton.locator("xpath=..").locator(".share-status")).toContainText("Copy the link below");
  const manualLink = page.getByRole("textbox", { name: "Link to share" });
  await expect(manualLink).toHaveValue("https://parispulse.ca/services");
  await expect(manualLink).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
});

test("public guide sharing invokes the native share API with a clean canonical URL", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: unknown) => {
        document.documentElement.dataset.shared = JSON.stringify(data);
      },
    });
  });

  await page.goto("/paris-ontario?utm_source=qa-share#native");
  const shareButton = page.getByRole("button", { name: "Share", exact: true }).first();
  await shareButton.click();

  await expect(shareButton.locator("xpath=..").locator(".share-status")).toContainText("Sharing completed.");
  await expect(page.locator("html")).toHaveAttribute(
    "data-shared",
    JSON.stringify({
      title: "Paris, Ontario resource guide",
      url: "https://parispulse.ca/paris-ontario",
    }),
  );
});
