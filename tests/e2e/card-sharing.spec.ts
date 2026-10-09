import { expect, test, type Page } from "@playwright/test";

async function firstNoticeCard(page: Page) {
  await page.goto("/app/feed");
  const card = page.locator(".notice-list .notice-card").first();
  await expect(card).toBeVisible();
  return card;
}

test.describe("contextual notice-card sharing", () => {
  test("opens by keyboard, focuses the first choice, closes to the trigger, and fits narrow cards", async ({
    page,
  }) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const card = await firstNoticeCard(page);
      const trigger = card.getByRole("button", { name: /Share notice/ });

      await trigger.focus();
      await page.keyboard.press("Enter");

      const panel = card.getByRole("dialog", { name: "Share this notice" });
      await expect(panel).toBeVisible();
      await expect(panel.getByRole("button", { name: "Copy link" })).toBeFocused();

      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      await expect(trigger).toBeFocused();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
    }
  });

  test("shows a clean manual URL when the card copy choice is denied", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new DOMException("denied", "NotAllowedError");
          },
        },
      });
    });

    const card = await firstNoticeCard(page);
    const titleLink = card.locator(".notice-title");
    const publicPath = await titleLink.getAttribute("href");
    expect(publicPath).toMatch(/^\/notice\//);

    await card.getByRole("button", { name: /Share notice/ }).click();
    await card.getByRole("button", { name: "Copy link" }).click();

    await expect(card.getByRole("status")).toContainText("Copy the link below");
    await expect(card.getByRole("textbox", { name: "Link to share" })).toHaveValue(
      `https://parispulse.ca${publicPath}`,
    );
  });

  test("does not contact social destinations until a choice is clicked", async ({
    page,
  }) => {
    const socialRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().startsWith("https://wa.me/")) socialRequests.push(request.url());
    });

    const card = await firstNoticeCard(page);
    await card.getByRole("button", { name: /Share notice/ }).click();
    await expect(card.getByRole("dialog", { name: "Share this notice" })).toBeVisible();

    const whatsapp = card.getByRole("link", { name: "WhatsApp" });
    const email = card.getByRole("link", { name: "Email" });
    await expect(whatsapp).toHaveAttribute("href", /https:\/\/wa\.me\/\?text=/);
    await expect(email).toHaveAttribute("href", /^mailto:/);
    await expect(whatsapp).not.toHaveAttribute("href", /utm_|source=|token=/i);
    await expect(email).not.toHaveAttribute("href", /utm_|source=|token=/i);
    expect(socialRequests).toEqual([]);
  });
});
