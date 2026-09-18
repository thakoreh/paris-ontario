import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("technical SEO artifacts", () => {
  it("ships a source-aware AI-search guide", async () => {
    const { GET } = await import("@/app/llms.txt/route");
    const body = await GET().text();
    expect(body).toContain("Paris Pulse");
    expect(body).toContain("official source");
    expect(body).toContain("not an emergency service");
  });

  it("declares canonical metadata and structured data at the site root", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).toContain("alternates");
    expect(layout).toContain("canonical");
    expect(layout).toContain("StructuredData");
  });

  it("allows retrieval crawlers while protecting private routes", () => {
    const robots = read("src/app/robots.ts");
    for (const bot of ["OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot"]) {
      expect(robots).toContain(bot);
    }
    expect(robots).toContain('"/app"');
    expect(robots).toContain('"/admin"');
  });

  it("indexes trust and editorial-policy pages", () => {
    const sitemap = read("src/app/sitemap.ts");
    for (const route of ["/editorial-policy", "/privacy", "/terms", "/contact"]) {
      expect(sitemap).toContain(route);
    }
  });

  it("lists the source-backed Paris Ontario hub in AI-search and sitemap artifacts", () => {
    const sitemap = read("src/app/sitemap.ts");
    expect(sitemap).toContain('"/paris-ontario"');
    const llms = read("src/app/llms.txt/route.ts");
    expect(llms).toContain("Paris, Ontario resource guide");
  });

  it("uses a fixed review date for the resource hub and does not stamp every static URL at request time", () => {
    const sitemap = read("src/app/sitemap.ts");
    expect(sitemap).toContain('["/paris-ontario", "monthly", 0.9, "2026-09-15"]');
    expect(sitemap).not.toContain("const lastModified = new Date()");
  });

  it("ships a reusable HTTP SEO verification command", () => {
    expect(fs.existsSync(path.join(root, "scripts/verify-seo.mjs"))).toBe(true);
    const packageJson = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>;
    };
    expect(packageJson.scripts?.["verify:seo"]).toContain("verify-seo.mjs");
  });

  it("checks sitemap details and route-aware social metadata", () => {
    const verifier = read("scripts/verify-seo.mjs");
    expect(verifier).toContain('property="og:image"');
    expect(verifier).toContain('property="og:url"');
    expect(verifier).toContain("/notice/");
    expect(verifier).toContain("deadline");
    expect(verifier).not.toContain(
      "Sitemap must contain at least one eligible notice or deadline detail URL",
    );
  });

  it("keeps the local OpenGraph image reachable through middleware", () => {
    const middleware = read("src/middleware.ts");
    expect(middleware).toContain('"/opengraph-image"');
  });
});
