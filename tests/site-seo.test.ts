import { describe, expect, it } from "vitest";
import type { Source } from "@/types";
import {
  contentFreshness,
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
});

describe("content freshness", () => {
  it("marks sources current only when every active source was checked on schedule", () => {
    const now = new Date("2026-09-15T16:00:00.000Z");
    expect(contentFreshness([source("2026-09-15T15:15:00.000Z")], now)).toMatchObject({
      state: "current",
      checkedSources: 1,
      staleSources: 0,
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
