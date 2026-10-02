import React from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { community, defaultPreferences } from "@/config/community";
import type { Notice, Source } from "@/types";
import type { usePersonal } from "@/components/provider";
import { Feed } from "@/components/feed";
import { NoticeCard } from "@/components/cards";
const state = vi.hoisted(() => ({
  personal: {} as ReturnType<typeof usePersonal>,
}));
vi.mock("@/components/provider", () => ({ usePersonal: () => state.personal }));
vi.mock("@/components/map-panel", () => ({
  MapPanel: () => React.createElement("div", null, "Map preview"),
}));
const now = new Date();
const old = new Date(+now - 14 * 86400000).toISOString();
const recent = new Date(+now - 86400000).toISOString();
const source = {
  id: "source",
  organization: "Official source",
  authority_level: "official",
} as Source;
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
  published_at: old,
  retrieved_at: recent,
  verified_at: recent,
  latitude: community.latitude,
  longitude: community.longitude,
  city: "Paris",
  tags_json: [],
  verification_status: "verified",
  confidence_score: 1,
  is_sample: false,
  ...changes,
});
const feed = (notices: Notice[], mode = "today") =>
  renderToString(
    React.createElement(Feed, {
      notices,
      deadlines: [],
      sources: [source],
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

describe("neighbourhood interface server rendering", () => {
  it("renders each notice once on Today with an honest first-visit explanation", () => {
    const html = feed([
      notice(),
      notice({ id: "event", slug: "event", category: "event" }),
    ]);
    expect(html.match(/data-notice-id="notice"/g)).toHaveLength(1);
    expect(html.match(/data-notice-id="event"/g)).toHaveLength(1);
    expect(html).toContain("Your first look around.");
    expect(html).toContain("No verified local opening announcements");
  });
  it("does not mark a recently reverified old notice new", () => {
    state.personal.lastVisitAt = new Date(+now - 3 * 86400000).toISOString();
    const html = feed([notice()]);
    expect(html).toContain("No newly published or source-updated notices");
    expect(html.match(/data-notice-id="notice"/g)).toHaveLength(1);
  });
  it("assigns a source-updated notice to New without duplicating it in Changes", () => {
    state.personal.lastVisitAt = new Date(+now - 3 * 86400000).toISOString();
    const html = feed([notice({ source_updated_at: recent })]);
    expect(html).toContain("1 verified update since");
    expect(html.match(/data-notice-id="notice"/g)).toHaveLength(1);
    expect(html).toContain("No current road or service changes in this view.");
  });
  it("honours the same private radius on Today, Explore and Map with an All Paris escape", () => {
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
        latitude: community.latitude + 0.03,
        longitude: community.longitude,
        location_type: "home",
        is_primary: true,
      },
    ];
    state.personal.preferences = { ...defaultPreferences, radius_km: 0.5 };
    for (const mode of [
      "today",
      "home",
      "app",
      "feed",
      "map",
      "personal-map",
    ]) {
      expect(feed([notice()], mode)).not.toContain('data-notice-id="notice"');
    }
    state.personal.areaScope = "all";
    for (const mode of [
      "today",
      "home",
      "app",
      "feed",
      "map",
      "personal-map",
    ]) {
      expect(feed([notice()], mode)).toContain('data-notice-id="notice"');
    }
  });
  it("does not present publication as an event date or invent opening hours", () => {
    const event = renderToString(
      React.createElement(NoticeCard, {
        notice: notice({ category: "event" }),
      }),
    );
    expect(event).toContain("Event date not listed");
    expect(event).not.toContain('class="event-date-badge"');
    const opening = renderToString(
      React.createElement(NoticeCard, {
        notice: notice({
          category: "downtown",
          tags_json: ["business_opening"],
        }),
      }),
    );
    expect(opening).toContain("notice-business");
    expect(opening).toContain(
      "Check the original announcement for dates and hours",
    );
    expect(opening).not.toContain("Open now");
  });
  it("renders genuine event dates and affected road areas as distinct facts", () => {
    const event = renderToString(
      React.createElement(NoticeCard, {
        notice: notice({
          category: "event",
          start_at: "2026-10-03T16:00:00Z",
          tags_json: ["free"],
        }),
      }),
    );
    expect(event).toContain('class="event-date-badge"');
    expect(event).toContain("Happening Oct 3");
    expect(event).toContain('class="notice-tags"');
    const road = renderToString(
      React.createElement(NoticeCard, {
        notice: notice({ affected_area_text: "North side of the bridge" }),
      }),
    );
    expect(road).toContain("Affected area");
    expect(road).toContain("North side of the bridge");
  });
});
