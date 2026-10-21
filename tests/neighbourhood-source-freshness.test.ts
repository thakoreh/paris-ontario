import { contentFreshness, formatSourceCheck } from "@/lib/site";
import { SourcesPage } from "@/components/public-pages";
import { CoverageStatus } from "@/components/coverage-status";
import React from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { community, defaultPreferences } from "@/config/community";
import type { Notice, Source } from "@/types";
import type { usePersonal } from "@/components/provider";
import { Feed } from "@/components/feed";

const state = vi.hoisted(() => ({
  personal: {} as ReturnType<typeof usePersonal>,
}));
vi.mock("@/components/provider", () => ({ usePersonal: () => state.personal }));
vi.mock("@/components/map-panel", () => ({
  MapPanel: () => React.createElement("div", null, "Map preview"),
}));
vi.mock("@/components/share-button", () => ({
  ShareButton: () => React.createElement("button", null, "Share"),
}));

const source = (last_checked_at: string | null): Source => ({
  id: "source",
  community_id: community.id,
  name: "Official source",
  organization: "County of Brant",
  source_type: "website",
  url: "https://example.test/source",
  description: "An official source",
  authority_level: "official",
  ingestion_type: "manual",
  ingestion_enabled: false,
  refresh_interval_minutes: 60,
  last_checked_at,
  last_success_at: last_checked_at,
  active: true,
});

const notice = (changes: Partial<Notice> = {}): Notice => ({
  id: "notice",
  community_id: community.id,
  source_id: "source",
  title: "Source-backed notice",
  slug: "notice",
  summary: "A public update",
  category: "roads",
  severity: "useful",
  official_url: "https://example.test/notice",
  published_at: new Date(Date.now() - 86400000).toISOString(),
  retrieved_at: new Date().toISOString(),
  verified_at: new Date().toISOString(),
  latitude: community.latitude,
  longitude: community.longitude,
  city: "Paris",
  tags_json: [],
  verification_status: "verified",
  confidence_score: 1,
  is_sample: false,
  ...changes,
});

const feed = (sources: Source[], notices: Notice[] = [], mode = "today") =>
  renderToString(
    React.createElement(Feed, {
      notices,
      deadlines: [],
      sources,
      mode,
    }),
  );

beforeEach(() => {
  state.personal = {
    profile: null,
    areaScope: "nearby",
    setAreaScope: vi.fn(),
    lastVisitAt: null,
    visitHistoryAvailable: true,
    locations: [],
    preferences: { ...defaultPreferences },
    saved: [],
    read: [],
    dismissed: [],
    reminders: [],
    ready: true,
    demo: false,
    guest: true,
    message: "",
    notify: vi.fn(),
    enterDemo: vi.fn(),
    saveLocation: vi.fn(),
    removeLocation: vi.fn(),
    savePreferences: vi.fn(),
    toggleNotice: vi.fn(),
    signOut: vi.fn(),
  };
});

describe("Internal source coverage notice", () => {
  it("keeps a weekly source within schedule after two days", () => {
    const html = coverage([{
      ...source(new Date(Date.now() - 2 * 86400000).toISOString()),
      refresh_interval_minutes: 10080,
    }]);
    expect(html).toContain("Source checks are within schedule");
    expect(html).not.toContain("overdue");
    expect(html).not.toContain("needs attention");
  });

  it("marks four-hour polling overdue after seven hours including its grace period", () => {
    const html = coverage([{
      ...source(new Date(Date.now() - 7 * 60 * 60_000).toISOString()),
      refresh_interval_minutes: 360,
    }]);
    expect(html.replace(/<!-- -->/g, "")).toContain("1 active source is overdue");
  });

  it("distinguishes Toronto daylight and standard times, including the repeated fall-back hour", () => {
    const now = new Date("2026-12-01T00:00:00Z");
    for (const [timestamp, expected] of [
      ["2026-10-18T19:00:00Z", "Oct 18, 2026, 3:00 PM EDT"],
      ["2026-07-18T19:00:00Z", "Jul 18, 2026, 3:00 PM EDT"],
      ["2026-11-01T05:30:00Z", "Nov 1, 2026, 1:30 AM EDT"],
      ["2026-11-01T06:30:00Z", "Nov 1, 2026, 1:30 AM EST"],
    ]) {
      expect(formatSourceCheck(timestamp, now)).toBe(`Last checked ${expected}`);
    }
  });

  it("renders the source card check time without duplicating its label", () => {
    const html = renderToString(React.createElement(SourcesPage, {
      sources: [source("2026-07-18T19:00:00Z")],
    }));
    expect(html).toContain("<dt>Last checked</dt><dd>Jul 18, 2026, 3:00 PM EDT</dd>");
    expect(html.match(/Last checked/g)).toHaveLength(1);
  });

  it("reports one missing check and one future check separately", () => {
    const sources = [source(null), { ...source("2099-01-01T00:00:00Z"), id: "future" }];
    expect(contentFreshness(sources)).toMatchObject({
      state: "attention", checkedSources: 0, futureOrInvalidChecks: 1, staleSources: 2,
    });
    const html = renderToString(React.createElement(SourcesPage, { sources })).replace(/<!-- -->/g, "");
    expect(html).toContain("1 active source has no recorded check.");
    expect(html).toContain("1 active source has an unusable check time.");
    expect(html).toContain("0 of 2 have a usable check; 2 need review.");
    expect(html).not.toContain("2 active sources have no recorded check");
  });

  it.each(["2099-01-01T00:00:00Z", "invalid", ""])("separates missing checks from unusable checks (%s)", (value) => {
    const sources = [source(null), { ...source(value), id: "unusable" },
      { ...source(new Date(Date.now() - 60_000).toISOString()), id: "valid" }];
    expect(contentFreshness(sources)).toMatchObject({
      state: "attention", checkedSources: 1, futureOrInvalidChecks: 1, staleSources: 2,
    });
    const banner = coverage(sources).replace(/<!-- -->/g, "");
    expect(banner).toContain("1 active source has no recorded check.");
    expect(banner).toContain("1 active source has an unusable check time.");
    const html = renderToString(React.createElement(SourcesPage, { sources })).replace(/<!-- -->/g, "");
    expect(html).toContain("1 of 3 have a usable check; 2 need review.");
    expect(html).toContain("1 active source has an unusable check time.");
    expect(html).toContain("<dt>Review status</dt><dd>Needs review</dd>");
    expect(html).toContain("<dt>Last checked</dt><dd>Check time unavailable</dd>");
    expect(html).toContain("<dt>Last checked</dt><dd>Not checked yet</dd>");
  });

  it("labels a never-checked source without inventing a timestamp", () => {
    const html = renderToString(React.createElement(SourcesPage, {
      sources: [source(null)],
    }));
    expect(html).toContain("Not checked yet");
    expect(html).not.toContain("Last checked Oct");
    expect(html).toContain("1 need review");
  });

  it("labels an on-schedule source check as current and links to source coverage", () => {
    const html = coverage([
      source(new Date(Date.now() - 5 * 60_000).toISOString()),
    ]);

    expect(html).toContain("Source checks are within schedule");
    expect(html).toContain('href="/sources"');
    expect(html).toContain("Review source coverage");
  });

  it("warns when active source checks are overdue without claiming there are no updates", () => {
    const html = coverage([
      source(new Date(Date.now() - 2 * 60 * 60_000).toISOString()),
    ]);

    expect(html).toContain("Source coverage needs attention");
    expect(html.replace(/<!-- -->/g, "")).toContain(
      "1 active source is overdue",
    );
    expect(html).toContain("may be incomplete");
    expect(html).not.toContain("No current notices");
  });

  it("distinguishes a source with no recorded check from a dated overdue check", () => {
    const html = coverage([source(null)]);

    expect(html).toContain("Source check history is incomplete");
    expect(html.replace(/<!-- -->/g, "")).toContain("has no recorded check");
    expect(html).not.toContain("active source is overdue");
  });

  it("explains unknown coverage when there are no active sources", () => {
    const html = coverage([]);

    expect(html).toContain("Source coverage is unknown");
    expect(html).toContain("No active source checks are available");
    expect(html).toContain("Review source coverage");
  });

  it("labels demo previews and does not present them as production coverage", () => {
    state.personal.demo = true;
    const html = coverage([
      source(new Date(Date.now() - 2 * 60 * 60_000).toISOString()),
    ]);

    expect(html).toContain("Sample preview");
    expect(html).toContain("does not count toward production coverage");
    expect(html).not.toContain("Source coverage needs attention");
  });
});

describe("Today actionable empty shelves", () => {
  it("hides empty event, business and community shelves", () => {
    const html = feed(
      [source(new Date(Date.now() - 5 * 60_000).toISOString())],
      [notice()],
    );

    expect(html).not.toContain('class="section-empty-actions"');
    expect(html).toContain('href="/services"');
    expect(html).not.toContain("Check Services");
    expect(html).toContain('href="/share-update"');
    expect(html).not.toContain("Share a source");
    expect(html).toContain('href="/sources"');
    expect(html).not.toContain("Review sources");
  });

  it("shows a quiet card for an empty nearby view", () => {
    state.personal.locations = [
      {
        id: "private",
        user_id: "guest",
        community_id: community.id,
        label: "My area",
        address_line: "Private address",
        city: "Paris",
        province: "Ontario",
        postal_code: "",
        latitude: community.latitude,
        longitude: community.longitude,
        location_type: "home",
        is_primary: true,
      },
    ];

    const html = feed(
      [source(new Date(Date.now() - 5 * 60_000).toISOString())],
      [],
    );

    expect(html).toContain("Quiet week in Paris");
  });

  it("does not suggest All Paris when the current view already covers Paris", () => {
    const html = feed([
      source(new Date(Date.now() - 5 * 60_000).toISOString()),
    ]);

    expect(html).not.toContain("Try All Paris");
  });

  it("uses prepare and source-review language and exposes the Today share action", () => {
    const html = feed([
      source(new Date(Date.now() - 5 * 60_000).toISOString()),
    ]);

    expect(html).toContain("Prepare a local update with its original source");
    expect(html).toContain("before it is published");
    expect(html).toContain("Invite a neighbour");
  });

  it("hides an empty Today map preview", () => {
    const html = feed(
      [source(new Date(Date.now() - 5 * 60_000).toISOString())],
      [notice({ latitude: null, longitude: null })],
    );

    expect(html).not.toContain("No updates have a map location yet");
    expect(html).not.toContain("Explore the update list");
    expect(html).not.toContain("Map preview");
  });
});

function coverage(sources: Source[]) {
  return renderToString(
    React.createElement(CoverageStatus, { sources, demo: state.personal.demo }),
  );
}
