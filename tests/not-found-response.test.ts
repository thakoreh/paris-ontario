import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createMiddleware } from "@/middleware";
import { GET } from "@/app/api/not-found/route";

describe("missing public documents", () => {
  it.each(["/unknown-page", "/notice/missing-detail", "/deadline/missing-detail"])("rewrites %s to an explicit 404 document", async (path) => {
    const response = await createMiddleware()(new NextRequest(`http://localhost${path}`));
    expect(response.status).toBe(404);
    expect(new URL(response.headers.get("x-middleware-rewrite")!).pathname).toBe("/api/not-found");
    const document = GET();
    expect(document.status).toBe(404);
    const html = await document.text();
    expect(html).toContain('name="robots" content="noindex"');
    expect(html).toContain("This update isn’t here.");
    expect(html).not.toMatch(/rel="canonical"|property="og:|name="twitter:/);
  });
});
