import { describe, it, expect } from "vitest";
import {
  haversine,
  scoreNotice,
  deadlineScore,
  isExpired,
  canInstantAlert,
  rankMatches,
} from "@/lib/relevance";
import { canEdit, ownsRow, sourceUrl, duplicateScore } from "@/lib/validation";
import { createSeed, demoLocations } from "@/data/seed";
import { defaultPreferences } from "@/config/community";
import { sources } from "@/config/sources";
import { summarizeSafely } from "@/lib/ai";
import { LocalEmailProvider, generateDigest } from "@/lib/email";
import {
  ManualSourceAdapter,
  HtmlSourceAdapter,
  ingest,
} from "@/lib/ingestion/adapters";
import { calendarEvent, countdown } from "@/lib/calendar";
const now = new Date("2026-09-07T16:00:00Z");
const { notices, deadlines } = createSeed(now);
const home = demoLocations();
describe("geospatial relevance", () => {
  it("calculates known Haversine distances", () => {
    expect(
      haversine({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }),
    ).toBeCloseTo(111.195, 2);
    expect(haversine(home[0], home[0])).toBe(0);
  });
  it("caps scores and explains a nearby saved location", () => {
    const m = scoreNotice(
      {
        ...notices[0],
        latitude: home[0].latitude,
        longitude: home[0].longitude,
      },
      home,
      defaultPreferences,
      now,
    )!;
    expect(m.relevance_score).toBe(100);
    expect(m.match_reasons_json).toContain("0 m from Home");
  });
  it("honours radius and category preference weighting", () => {
    const n = {
      ...notices[0],
      latitude: home[0].latitude + 0.04,
      longitude: home[0].longitude,
    };
    expect(scoreNotice(n, [home[0]], defaultPreferences, now)).toBeNull();
    const nearby = {
      ...n,
      latitude: home[0].latitude + 0.02,
      severity: "info" as const,
      published_at: "2026-09-01T00:00:00Z",
    };
    const a = scoreNotice(nearby, [home[0]], defaultPreferences, now)!;
    const b = scoreNotice(
      nearby,
      [home[0]],
      { ...defaultPreferences, categories_json: [] },
      now,
    )!;
    expect(a.relevance_score - b.relevance_score).toBe(25);
  });
  it("matches community wide notices without inventing distance", () => {
    const m = scoreNotice(notices[5], home, defaultPreferences, now)!;
    expect(m.distance_km).toBeNull();
    expect(m.match_reasons_json).toContain("Affects all of Paris");
  });
  it("excludes expired notices and drafts", () => {
    expect(isExpired(notices[35], now)).toBe(true);
    expect(scoreNotice(notices[35], home, defaultPreferences, now)).toBeNull();
    expect(
      scoreNotice(
        { ...notices[0], verification_status: "draft" },
        home,
        defaultPreferences,
        now,
      ),
    ).toBeNull();
  });
  it("expires events at end time", () =>
    expect(
      isExpired(
        { ...notices[0], expires_at: null, end_at: now.toISOString() },
        now,
      ),
    ).toBe(true));
  it("orders urgent official notices first", () => {
    const a = scoreNotice(notices[0], home, defaultPreferences, now)!;
    const b = scoreNotice(notices[5], home, defaultPreferences, now)!;
    expect(rankMatches([a, b], () => "official")[0].notice.id).toBe(
      b.notice.id,
    );
  });
});
describe("deadlines", () => {
  it("scores 24-hour and seven-day windows", () => {
    expect(deadlineScore(deadlines[0], now)).toBe(20);
    expect(deadlineScore(deadlines[1], now)).toBe(10);
    expect(
      deadlineScore(
        { ...deadlines[0], deadline_at: "2026-09-06T00:00:00Z" },
        now,
      ),
    ).toBe(0);
  });
  it("exports sample labels and escapes calendar content", () => {
    const ics = calendarEvent({ ...deadlines[0], title: "A, B; C\nD" });
    expect(ics).toContain("SUMMARY:[Sample data] A\\, B\\; C\\nD");
    expect(ics).toContain("DTSTART:20260908T100000Z");
  });
  it("shows past deadlines", () =>
    expect(countdown("2026-01-01T00:00:00Z", now)).toBe("Past"));
});
describe("trust and authorization", () => {
  it("requires editor or admin role", () => {
    expect(canEdit("user")).toBe(false);
    expect(canEdit(null)).toBe(false);
    expect(canEdit("editor")).toBe(true);
    expect(canEdit("admin")).toBe(true);
  });
  it("isolates private ownership", () => {
    expect(ownsRow("a", { user_id: "b" })).toBe(false);
    expect(ownsRow(null, { user_id: "a" })).toBe(false);
    expect(ownsRow("a", { user_id: "a" })).toBe(true);
  });
  it("rejects unsafe URLs", () => {
    for (const url of [
      "javascript:alert(1)",
      "http://brant.ca",
      "https://127.0.0.1",
      "https://user:secret@brant.ca",
      "https://192.168.0.1",
    ])
      expect(sourceUrl.safeParse(url).success).toBe(false);
    expect(sourceUrl.safeParse("https://www.brant.ca/news/").success).toBe(
      true,
    );
  });
  it("does not send sample or community alerts", () => {
    expect(canInstantAlert(notices[4], "official")).toBe(false);
    expect(
      canInstantAlert(
        { ...notices[4], is_sample: false, end_at: null, expires_at: null },
        "community_signal",
      ),
    ).toBe(false);
  });
  it("detects duplicates without treating every same-source notice as duplicate", () => {
    expect(duplicateScore(notices[0], notices[0])).toBe(1);
    expect(duplicateScore(notices[0], notices[7])).toBeLessThan(0.8);
  });
  it("labels all fictional seed objects", () => {
    expect(notices.length).toBeGreaterThanOrEqual(35);
    expect(deadlines.length).toBe(8);
    expect(notices.every((n) => n.is_sample)).toBe(true);
    expect(
      notices.filter((n) => n.verification_status === "expired"),
    ).toHaveLength(4);
  });
});
describe("graceful optional integrations", () => {
  it("works without AI and preserves source on failure", async () => {
    expect(await summarizeSafely("original")).toEqual({
      text: "original",
      ai_used: false,
      review_required: false,
    });
    expect(
      (
        await summarizeSafely("original", {
          summarize: async () => {
            throw Error("offline");
          },
        })
      ).text,
    ).toBe("original");
  });
  it("does not claim email delivery without provider", async () =>
    expect(
      (
        await new LocalEmailProvider().send({
          to: "x@example.test",
          subject: "x",
          text: "x",
        })
      ).status,
    ).toBe("not_configured"));
  it("excludes sample content from outbound digest", () => {
    const m = scoreNotice(notices[0], home, defaultPreferences, now)!;
    expect(
      generateDigest([m], deadlines, "https://example.com").notice_ids,
    ).toHaveLength(0);
  });
  it("manual ingestion keeps original and requires review", async () => {
    const adapter = new ManualSourceAdapter(sources[0], [
      {
        external_id: "one",
        title: "Original",
        body: "Original source body",
        url: sources[0].url,
        published_at: now.toISOString(),
      },
    ]);
    const run = await ingest(adapter);
    expect(run.status).toBe("success");
    expect(run.notices[0].body).toBe("Original source body");
    expect(run.notices[0].verification_status).toBe("needs_review");
  });
  it("does not scrape unreviewed sources", async () => {
    const adapter = new HtmlSourceAdapter(
      sources[0],
      async () => "<p>test</p>",
      () => [],
    );
    expect((await ingest(adapter)).status).toBe("failed");
  });
});
