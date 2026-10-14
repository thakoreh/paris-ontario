import { describe, expect, it, vi, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  trailEntries,
  visitingEntries,
  filterExplore,
  councilConfig,
  councilDecisions,
} from "@/lib/explore-content";
import { withRetry } from "@/lib/retry";
import { loadExploreNotices } from "@/lib/explore-map-data";
import {
  todayContent,
  parisGreeting,
  essentials,
  quickTasks,
} from "@/lib/today";
import { TodayPage } from "@/components/today-page";
import { verifiedPreview } from "@/data/verified-preview";
import type { Notice } from "@/types";
vi.mock("@/components/cards", () => ({
  NoticeCard: () => null,
  DeadlineCard: () => null,
}));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const now = new Date("2026-10-14T16:00:00Z");
const notice = (overrides: Partial<Notice> = {}) =>
  ({
    ...verifiedPreview.notices[0],
    expires_at: "2099-01-01T00:00:00Z",
    end_at: null,
    published_at: "2026-10-01T00:00:00Z",
    verified_at: "2026-10-01T00:00:00Z",
    verification_status: "verified",
    is_sample: false,
    ...overrides,
  }) as Notice;
describe("Explore and council content", () => {
  it("attributes every guide to an official destination and a durable review date", () => {
    for (const entry of [...trailEntries, ...visitingEntries]) {
      expect(new URL(entry.source_url).hostname).toMatch(
        /(^|\.)(brant\.ca|grandriver\.ca|downtownparis\.ca)$/,
      );
      expect(entry.reviewed_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.description).not.toMatch(
        /\d+\s*(km|metres|hours)|open daily/i,
      );
    }
    expect(trailEntries).toHaveLength(4);
    expect(visitingEntries.find((e) => e.id === "weekend")?.href).toBe(
      "/events",
    );
  });
  it("filters all five chips and includes dining in Visiting", () => {
    const all = [...trailEntries, ...visitingEntries];
    expect(filterExplore(all, "all")).toEqual(all);
    expect(filterExplore(all, "river").map((e) => e.id)).toEqual([
      "grand-river",
    ]);
    expect(filterExplore(all, "trails")).toHaveLength(3);
    expect(filterExplore(all, "downtown").map((e) => e.id)).toEqual([
      "downtown",
    ]);
    expect(filterExplore(all, "visiting")).toEqual(visitingEntries);
  });
  it("leaves election and meeting content empty and gates council notices", () => {
    expect(councilConfig).toEqual({
      election: null,
      nextMeeting: null,
      committees: [],
    });
    const valid = notice({ tags_json: ["Council"] });
    expect(
      councilDecisions(
        [
          valid,
          notice({ tags_json: [] }),
          notice({ tags_json: ["council"], is_sample: true }),
          notice({ tags_json: ["council"], verified_at: null }),
          notice({ tags_json: ["council"], verification_status: "draft" }),
        ],
        now,
      ),
    ).toEqual([valid]);
  });
});
describe("map recovery", () => {
  it("uses two backoff retries, then returns a recovered result", async () => {
    vi.useFakeTimers();
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error())
      .mockRejectedValueOnce(new Error())
      .mockResolvedValue("map");
    const pending = withRetry(operation);
    expect(operation).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(250);
    expect(operation).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(500);
    expect(await pending).toBe("map");
    expect(operation).toHaveBeenCalledTimes(3);
  });
  it("retries network/HTTP failures before rejecting the client map request", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("connection closed"))
      .mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetcher);
    const pending = expect(loadExploreNotices()).rejects.toThrow(
      "Notice map unavailable",
    );
    await vi.runAllTimersAsync();
    await pending;
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("returns data after a transient HTTP failure", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValue({ ok: true, json: async () => ({ notices: [] }) });
    vi.stubGlobal("fetch", fetcher);
    const pending = loadExploreNotices();
    await vi.runAllTimersAsync();
    expect(await pending).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not fetch for an aborted view", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    controller.abort();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const pending = expect(
      loadExploreNotices(controller.signal),
    ).rejects.toThrow();
    await vi.runAllTimersAsync();
    await pending;
    expect(fetcher).not.toHaveBeenCalled();
  });
});
describe("Today", () => {
  it("limits weekend events to three and excludes unverified content", () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      notice({
        id: `event-${i}`,
        category: "event",
        start_at: "2026-10-17T14:00:00Z",
      }),
    );
    const content = todayContent(
      [
        ...events,
        notice({
          category: "event",
          start_at: "2026-10-17T14:00:00Z",
          is_sample: true,
        }),
      ],
      [],
      now,
    );
    expect(content.weekend).toHaveLength(3);
    expect(content.deadlines).toEqual([]);
    expect(content.notices).toEqual([]);
  });
  it("shows the AC5 quiet week with one notice and no events or deadlines", () => {
    const html = renderToStaticMarkup(createElement(TodayPage, {
      notices: [notice({ category: "recreation" })], deadlines: [], sources: [], now,
    }));
    expect(html.match(/Quiet week in Paris/g)).toHaveLength(1);
    expect(html).not.toContain("<h2>Local notices");
    expect(html).toContain("Browse Services or Explore.");
    expect(html).toContain('href="/services"');
    expect(html).toContain('href="/explore"');
  });
  it("hides empty headings and shows one calm fallback with essentials and quick tasks", () => {
    const html = renderToStaticMarkup(
      createElement(TodayPage, {
        notices: [],
        deadlines: [],
        sources: [],
        now,
      }),
    );
    expect(html).not.toContain("<h2>Deadlines");
    expect(html).not.toContain("<h2>This weekend");
    expect(html.match(/Quiet week in Paris/g)).toHaveLength(1);
    expect(essentials).toHaveLength(4);
    for (const tile of essentials) expect(html).toContain(tile.url);
    for (const task of quickTasks) expect(html).toContain(task.href);
    expect(parisGreeting(new Date("2026-10-14T11:00:00Z"))).toBe(
      "Good morning, Paris",
    );
    expect(parisGreeting(new Date("2026-10-14T23:00:00Z"))).toBe(
      "Good evening, Paris",
    );
  });
});
