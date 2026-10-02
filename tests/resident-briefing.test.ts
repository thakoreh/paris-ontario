import { describe, expect, it } from "vitest";
import type { Notice } from "@/types";
import {
  isThisWeekend,
  latestVerification,
  localDateKey,
  noticeDateLabel,
  weekendDates,
} from "@/lib/resident-briefing";

const event = (changes: Partial<Notice> = {}): Notice => ({
  id: "event",
  community_id: "paris",
  source_id: "source",
  title: "A verified event",
  slug: "verified-event",
  summary: "Source-backed event",
  category: "event",
  severity: "useful",
  official_url: "https://example.com/event",
  published_at: "2026-09-25T16:00:00Z",
  retrieved_at: "2026-09-25T17:00:00Z",
  verified_at: "2026-09-25T17:00:00Z",
  start_at: "2026-10-03T16:00:00Z",
  end_at: "2026-10-03T20:00:00Z",
  latitude: null,
  longitude: null,
  city: "Paris",
  tags_json: [],
  verification_status: "verified",
  confidence_score: 1,
  is_sample: false,
  ...changes,
});
const friday = new Date("2026-10-02T16:00:00Z");

describe("resident briefing dates", () => {
  it("uses Paris calendar days, not the server time zone", () => {
    expect(localDateKey("2026-10-03T02:00:00Z")).toBe("2026-10-02");
    expect(weekendDates(friday)).toEqual({
      start: "2026-10-03",
      end: "2026-10-04",
    });
    expect(weekendDates(new Date("2026-10-05T02:00:00Z"))).toEqual({
      start: "2026-10-03",
      end: "2026-10-04",
    });
    expect(weekendDates(new Date("2026-10-05T14:00:00Z"))).toEqual({
      start: "2026-10-10",
      end: "2026-10-11",
    });
  });
  it("includes multi-day events overlapping the coming weekend", () => {
    expect(isThisWeekend(event(), friday)).toBe(true);
    expect(
      isThisWeekend(
        event({
          start_at: "2026-09-18T14:00:00Z",
          end_at: "2026-10-04T21:00:00Z",
        }),
        friday,
      ),
    ).toBe(true);
    expect(
      isThisWeekend(
        event({
          start_at: "2026-10-10T14:00:00Z",
          end_at: "2026-10-10T21:00:00Z",
        }),
        friday,
      ),
    ).toBe(false);
  });
  it("does not invent event dates from publication or include expired/unverified items", () => {
    expect(isThisWeekend(event({ start_at: null }), friday)).toBe(false);
    expect(
      isThisWeekend(event({ verification_status: "needs_review" }), friday),
    ).toBe(false);
    expect(
      isThisWeekend(event({ expires_at: "2026-10-01T12:00:00Z" }), friday),
    ).toBe(false);
    expect(isThisWeekend(event({ category: "roads" }), friday)).toBe(false);
    expect(isThisWeekend(event({ start_at: "invalid" }), friday)).toBe(false);
  });
  it("handles year boundaries and daylight saving weekends", () => {
    expect(weekendDates(new Date("2026-12-31T17:00:00Z"))).toEqual({
      start: "2027-01-02",
      end: "2027-01-03",
    });
    expect(weekendDates(new Date("2026-11-01T06:30:00Z"))).toEqual({
      start: "2026-10-31",
      end: "2026-11-01",
    });
  });
  it("labels actual event/effective dates separately from publication", () => {
    expect(noticeDateLabel(event())).toBe("Happening Oct 3");
    expect(noticeDateLabel(event({ start_at: null }))).toBe("Published Sep 25");
    expect(
      noticeDateLabel(
        event({ category: "construction", end_at: "2026-10-04T20:00:00Z" }),
      ),
    ).toBe("From Oct 3 – Oct 4");
  });
  it("never presents samples or unverified rows as feed verification", () => {
    expect(latestVerification([event({ is_sample: true })])).toBeNull();
    expect(
      latestVerification([event({ verification_status: "draft" })]),
    ).toBeNull();
    expect(
      latestVerification([
        event(),
        event({ verified_at: "2026-10-02T11:00:00Z" }),
      ]),
    ).toBe("2026-10-02T11:00:00Z");
  });
});
