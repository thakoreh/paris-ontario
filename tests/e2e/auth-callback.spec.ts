import { expect, test } from "@playwright/test";
test("invalid auth callback reaches the handler rather than 404", async ({ request }) => {
  const response = await request.get("/auth/callback?error=access_denied", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toMatch(/\/login\?error=confirmation$/);
});
