import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Source } from "@/types";
import {
  canonicalWwwRedirect,
  contentFreshness,
  formatSourceCheck,
  normalizePublicUrl,
  sitePath,
} from "@/lib/site";

const source = (last_checked_at: string | null): Source => ({
  id: "00000000-0000-4000-8000-000000000001",
  community_id: "00000000-0000-4000-8000-000000000001",
  name: "County of Brant News",
  organization: "County of Brant",
  source_type: "website",
  url: "https://www.brant.ca/news/",
  description: "Official public information.",
  authority_level: "official",
  ingestion_type: "manual",
  ingestion_enabled: false,
  refresh_interval_minutes: 60,
  last_checked_at,
  last_success_at: last_checked_at,
  active: true,
});

describe("public-site configuration", () => {
  it("gives the homepage a Paris, Ontario search title", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src/app/page.tsx"),
      "utf8",
    );
    expect(page).toContain('"Paris, Ontario local updates and resources"');
    expect(page).toContain(
      '"Source-linked local updates, practical resources and community information for Paris, Ontario."',
    );
  });

  it("accepts only a normalized HTTPS production URL", () => {
    expect(normalizePublicUrl("https://parispulse.ca/")?.toString()).toBe(
      "https://parispulse.ca/",
    );
    expect(normalizePublicUrl("http://parispulse.ca")).toBeNull();
    expect(normalizePublicUrl("not a URL")).toBeNull();
  });

  it("creates root-relative canonical paths from a configured public URL", () => {
    const url = normalizePublicUrl("https://parispulse.ca/");
    expect(sitePath(url, "/sources")).toBe("https://parispulse.ca/sources");
  });

  it("redirects based on the validated host header when the request URL is internal", () => {
    expect(
      canonicalWwwRedirect(
        "https://parispulse.ca",
        new URL("http://localhost/sources?source=county"),
        "www.parispulse.ca",
      )?.toString(),
    ).toBe("https://parispulse.ca/sources?source=county");
    expect(
      canonicalWwwRedirect(
        "https://parispulse.ca",
        new URL("http://localhost/sources?source=county"),
        "parispulse.ca",
      ),
    ).toBeNull();
  });

  it("keeps protocol-relative request paths on the canonical host", () => {
    expect(
      canonicalWwwRedirect(
        "https://parispulse.ca",
        new URL("https://www.parispulse.ca//evil.example/path?x=1"),
        "www.parispulse.ca",
      )?.toString(),
    ).toBe("https://parispulse.ca//evil.example/path?x=1");
  });
});

describe("content freshness", () => {
  it("rejects checks beyond five minutes of clock skew", () => {
    const now = new Date("2026-10-18T19:00:00Z");
    for (const value of ["2099-01-01T00:00:00Z", "2026-10-18T19:05:00.001Z", "invalid", ""]) {
      expect(formatSourceCheck(value, now)).toBe("Check time unavailable");
      expect(contentFreshness([source(value)], now)).toEqual({
        state: "attention", checkedSources: 0, futureOrInvalidChecks: 1, staleSources: 1, newestCheck: null,
      });
    }
    const tolerated = "2026-10-18T19:05:00.000Z";
    expect(formatSourceCheck(tolerated, now)).toMatch(/^Last checked /);
    expect(contentFreshness([source(tolerated)], now)).toEqual({
      state: "current", checkedSources: 1, futureOrInvalidChecks: 0, staleSources: 0, newestCheck: tolerated,
    });
    expect(formatSourceCheck(null, now)).toBe("Not checked yet");
    expect(formatSourceCheck("invalid", now)).toBe("Check time unavailable");
  });

  it("marks sources current only when every active source was checked on schedule", () => {
    const now = new Date("2026-09-15T16:00:00.000Z");
    expect(contentFreshness([source("2026-09-15T15:15:00.000Z")], now)).toMatchObject({
      state: "current",
      checkedSources: 1,
      staleSources: 0,
    });
  });

  it("uses each source's interval and treats never-checked sources as needing attention", () => {
    const now = new Date("2026-10-18T19:00:00Z");
    const weekly = { ...source("2026-10-16T19:00:00Z"), refresh_interval_minutes: 10080 };
    const automated = { ...source("2026-10-18T13:00:00Z"), refresh_interval_minutes: 360 };
    expect(contentFreshness([weekly, automated], now)).toMatchObject({
      state: "current", staleSources: 0,
    });
    expect(contentFreshness([weekly, automated], new Date("2026-10-18T20:00:00Z"))).toMatchObject({
      state: "attention", staleSources: 1,
    });
    expect(contentFreshness([source(null)], now)).toMatchObject({
      state: "attention", checkedSources: 0, staleSources: 1, newestCheck: null,
    });
  });

  it("shows attention needed when a source has never been checked or is overdue", () => {
    const now = new Date("2026-09-15T16:00:00.000Z");
    expect(
      contentFreshness(
        [source(null), source("2026-09-15T13:00:00.000Z")],
        now,
      ),
    ).toMatchObject({ state: "attention", checkedSources: 1, staleSources: 2 });
  });
});
