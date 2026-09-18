import { expect, test } from "@playwright/test";

function metadataPresence(html: string) {
  return {
    canonical: /<link[^>]+rel=["']canonical["']/i.test(html),
    openGraph: /<meta[^>]+property=["']og:/i.test(html),
    twitter: /<meta[^>]+name=["']twitter:/i.test(html),
  };
}

test.describe("rendered SEO metadata", () => {
  test("keeps the root and a public guide shareable", async ({ request }) => {
    for (const path of ["/", "/paris-ontario"]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      const html = await response.text();
      expect(html, path).toContain("https://parispulse.ca/opengraph-image");
      expect(html, path).toMatch(/property=["']og:image["']/i);
      expect(html, path).toMatch(/name=["']twitter:image["']/i);
    }
  });

  test("does not render public metadata on private routes", async ({ request }) => {
    for (const path of ["/app", "/notifications", "/login"]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(metadataPresence(await response.text()), path).toEqual({
        canonical: false,
        openGraph: false,
        twitter: false,
      });
    }
  });

  test("returns metadata-clean 404 documents for missing and expired details", async ({ request }) => {
    for (const path of ["/notice/missing-seo-detail", "/notice/expired-seo-detail"]) {
      const response = await request.get(path, { failOnStatusCode: false });
      expect(response.status(), path).toBe(404);
      expect(metadataPresence(await response.text()), path).toEqual({
        canonical: false,
        openGraph: false,
        twitter: false,
      });
    }
  });
});