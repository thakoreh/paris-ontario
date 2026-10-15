import { describe, expect, it } from "vitest";
import type { Notice } from "@/types";
import { isQuietWeek, todayContent } from "@/lib/today";

const now = new Date("2026-10-14T16:00:00Z");
const notice: Notice = {
  id: "notice-1",
  community_id: "paris",
  source_id: "source-1",
  title: "Road closure",
  slug: "road-closure",
  summary: "A current road closure in Paris.",
  category: "roads",
  severity: "useful",
  official_url: "https://www.brant.ca/news/notice",
  published_at: "2026-10-14T12:00:00Z",
  retrieved_at: "2026-10-14T13:00:00Z",
  verified_at: "2026-10-14T13:00:00Z",
  end_at: "2026-10-16T16:00:00Z",
  expires_at: "2026-10-16T16:00:00Z",
  latitude: null,
  longitude: null,
  city: "Paris",
  tags_json: [],
  verification_status: "verified",
  confidence_score: 1,
  is_sample: false,
};

describe("Today quiet week", () => {
  it("is not quiet when only local notices are present", () => {
    expect(
      isQuietWeek({ weekend: [], deadlines: [], notices: [notice] }),
    ).toBe(false);
  });

  it("is quiet when all content sections are empty", () => {
    expect(isQuietWeek({ weekend: [], deadlines: [], notices: [] })).toBe(true);
  });

  it("is not quiet when todayContent includes a current notice", () => {
    const content = todayContent([notice], [], now);

    expect(content.weekend).toEqual([]);
    expect(content.deadlines).toEqual([]);
    expect(content.notices).toEqual([notice]);
    expect(isQuietWeek(content)).toBe(false);
  });
});
