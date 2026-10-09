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

const feed = (
  sources: Source[],
  notices: Notice[] = [],
  mode = "today",
) =>
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
    remind: vi.fn(),
    signOut: vi.fn(),
  };
});

describe("Today source coverage notice", () => {
  it("labels an on-schedule source check as current and links to source coverage", () => {
    const html = feed([
      source(new Date(Date.now() - 5 * 60_000).toISOString()),
    ]);

    expect(html).toContain("Source checks are within schedule");
    expect(html).toContain('href="/sources"');
    expect(html).toContain("Review source coverage");
  });

  it("warns when active source checks are overdue without claiming there are no updates", () => {
    const html = feed([
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
    const html = feed([source(null)]);

    expect(html).toContain("Source check history is incomplete");
    expect(html.replace(/<!-- -->/g, "")).toContain(
      "has no recorded check",
    );
    expect(html).not.toContain("active source is overdue");
  });

  it("explains unknown coverage when there are no active sources", () => {
    const html = feed([]);

    expect(html).toContain("Source coverage is unknown");
    expect(html).toContain("No active source checks are available");
    expect(html).toContain("Review source coverage");
  });

  it("labels demo previews and does not present them as production coverage", () => {
    state.personal.demo = true;
    const html = feed([
      source(new Date(Date.now() - 2 * 60 * 60_000).toISOString()),
    ]);

    expect(html).toContain("Sample preview");
    expect(html).toContain(
      "does not count toward production coverage",
    );
    expect(html).not.toContain("Source coverage needs attention");
  });
});

describe("Today actionable empty shelves", () => {
  it("keeps empty event, business and community shelves useful", () => {
    const html = feed(
      [source(new Date(Date.now() - 5 * 60_000).toISOString())],
      [notice()],
    );

    expect(html).toContain('class="section-empty-actions"');
    expect(html).toContain('href="/services"');
    expect(html).toContain("Check Services");
    expect(html).toContain('href="/share-update"');
    expect(html).toContain("Share a source");
    expect(html).toContain('href="/sources"');
    expect(html).toContain("Review sources");
  });

  it("offers the existing All Paris scope action for nearby empty shelves", () => {
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

    expect(html).toContain("View all Paris");
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

  it("replaces an empty Today map preview with a compact list action", () => {
    const html = feed([
      source(new Date(Date.now() - 5 * 60_000).toISOString()),
    ], [notice({ latitude: null, longitude: null })]);

    expect(html).toContain("No updates have a map location yet");
    expect(html).toContain("Explore the update list");
    expect(html).not.toContain("Map preview");
  });
});
