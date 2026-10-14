import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { defaultPreferences } from "@/config/community";
import { Feed } from "@/components/feed";
import { EventsPage } from "@/components/events-page";
import { EmptyState } from "@/components/cards";
vi.mock("@/components/provider", () => ({
  usePersonal: () => ({
    locations: [],
    preferences: defaultPreferences,
    saved: [],
    dismissed: [],
    read: [],
    areaScope: "all",
    ready: true,
    profile: null,
    demo: false,
    lastVisitAt: null,
  }),
}));
vi.mock("@/components/map-panel", () => ({ MapPanel: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }), usePathname: () => "/events", useSearchParams: () => new URLSearchParams() }));

describe("public hygiene", () => {
  it("keeps event headings in order with no listings", () => {
    const html = renderToStaticMarkup(React.createElement(EventsPage, { notices: [], sources: [], unavailable: false, now: "2026-10-14T16:00:00Z" }));
    const levels = Array.from(html.matchAll(/<h([1-6])(?:\s|>)/g), match => Number(match[1]));
    levels.forEach((level, index) => { if (index) expect(level).toBeLessThanOrEqual(levels[index - 1] + 1); });
  });
  it("renders one quiet card without empty sections, rails or zero results", () => {
    const html = renderToStaticMarkup(
      React.createElement(Feed, {
        notices: [],
        deadlines: [],
        sources: [],
        mode: "home",
      }),
    );
    expect(html.match(/Quiet week in Paris/g)).toHaveLength(1);
    expect(html).toContain('href="/services"');
    expect(html).toContain('href="/explore"');
    for (const text of [
      "section-empty",
      "map-preview-empty",
      "Coming up",
      "section-count",
      "Showing 0",
      "0 updates",
      "Source coverage needs attention",
      "overdue",
    ])
      expect(html).not.toContain(text);
  });
  it("uses an h2 for an empty state directly below a page heading", () => {
    expect(
      renderToStaticMarkup(
        React.createElement(EmptyState, { title: "No deadlines" }),
      ),
    ).toContain("<h2>No deadlines</h2>");
  });
  it("loads the specified font and keeps the theme compatibility alias", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toContain('weight: ["400", "600", "700"]');
    expect(layout).toContain('fallback: ["system-ui"]');
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain("--green: var(--river)");
    expect(css).toContain("--ink: #0f2e33");
    expect(css).not.toContain("Georgia");
  });
});
