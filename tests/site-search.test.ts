import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { searchSite } from "@/lib/site-search";
import { queryUrl, queryValue, updateQuery } from "@/lib/query-state";
import { createSeed } from "@/data/seed";
import { SiteSearch } from "@/components/site-search";

afterEach(() => vi.unstubAllGlobals());
describe("site search", () => {
  it("finds the official garbage/recycling service without notices", () => {
    const result = searchSite(" garbage ", []).find(
      (r) => r.id === "service-waste",
    );
    expect(result?.title).toBe("Garbage, recycling & yard waste");
    expect(result?.sourceUrl).toContain("brant.ca/garbage-and-recycling/");
    expect(result?.href).toContain("/services?q=");
  });
  it("searches Paris, newcomer and Explore guides", () => {
    expect(
      searchSite("garbage", []).some((r) =>
        r.href.startsWith("/paris-ontario"),
      ),
    ).toBe(true);
    expect(
      searchSite("library", []).some((r) => r.href === "/new-to-paris"),
    ).toBe(true);
    expect(
      searchSite("Cambridge", []).some((r) =>
        r.href.startsWith("/explore/trails"),
      ),
    ).toBe(true);
  });
  it("requires every term and handles empty or unmatched queries", () => {
    expect(
      searchSite("garbage recycling", []).some((r) => r.id === "service-waste"),
    ).toBe(true);
    expect(searchSite("garbage spacecraft", [])).toEqual([]);
    expect(searchSite("   ", [])).toEqual([]);
  });
  it("searches public notices while excluding samples and unreviewed content", () => {
    const now = new Date("2026-10-14T12:00:00Z");
    const fixture = {
      ...createSeed(now).notices[0],
      title: "Garbage collection notice",
      is_sample: false,
      published_at: "2026-10-13T12:00:00Z",
      expires_at: null,
    };
    expect(
      searchSite("garbage", [fixture], now).some((r) => r.kind === "Notice"),
    ).toBe(true);
    expect(
      searchSite("garbage", [{ ...fixture, is_sample: true }], now).some(
        (r) => r.kind === "Notice",
      ),
    ).toBe(false);
    expect(
      searchSite(
        "garbage",
        [{ ...fixture, verification_status: "needs_review" }],
        now,
      ).some((r) => r.kind === "Notice"),
    ).toBe(false);
  });
  it("offers helpful guidance before searching", () => {
    const html = renderToStaticMarkup(
      React.createElement(SiteSearch, { notices: [] }),
    );
    expect(html).toContain(
      "Search services, guides, places to explore and local notices.",
    );
    expect(html).not.toContain("0 updates");
  });
});
describe("URL filter state", () => {
  it("preserves unrelated parameters and fragments and removes cleared filters", () => {
    const url = queryUrl(
      "https://parispulse.ca/services?category=Home&q=old&keep=yes#anchor",
      { q: "garbage & recycling" },
    );
    const params = new URL(url, "https://parispulse.ca").searchParams;
    expect(params.get("q")).toBe("garbage & recycling");
    expect(params.get("category")).toBe("Home");
    expect(
      queryUrl(`https://parispulse.ca${url}`, { q: null, category: null }),
    ).toBe("/services?keep=yes#anchor");
  });
  it("restores filters from URL and falls back for invalid values", () => {
    expect(
      queryValue(new URLSearchParams("range=7d"), "range", "month", [
        "today",
        "7d",
        "month",
      ]),
    ).toBe("7d");
    expect(
      queryValue(new URLSearchParams("range=invalid"), "range", "month", [
        "today",
        "7d",
        "month",
      ]),
    ).toBe("month");
    expect(
      queryValue(
        new URLSearchParams("q=garbage&category=Home+%26+property"),
        "category",
        "all",
      ),
    ).toBe("Home & property");
    expect(queryValue(new URLSearchParams("q=garbage"), "q", "")).toBe(
      "garbage",
    );
  });
  it("writes a history entry and notifies mounted filters", () => {
    const pushState = vi.fn();
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", {
      location: { href: "https://parispulse.ca/deadlines" },
      history: { pushState },
      dispatchEvent,
    });
    updateQuery({ range: "7d" });
    expect(pushState).toHaveBeenCalledWith(null, "", "/deadlines?range=7d");
    expect(dispatchEvent.mock.calls[0][0].type).toBe("parispulse:query-change");
  });
});
