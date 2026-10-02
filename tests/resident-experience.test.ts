import { describe, expect, it } from "vitest";
import type { Match, Notice } from "@/types";
import {
  changedSinceVisit,
  groupTodayMatches,
  latestPublicChangeAt,
  noticeKind,
  validVisitCheckpoint,
} from "@/lib/resident-experience";

const now = new Date("2026-10-02T18:00:00Z");
const checkpoint = "2026-10-01T18:00:00Z";
const notice = (changes: Partial<Notice> = {}): Notice => ({
  id: "notice",
  community_id: "paris",
  source_id: "source",
  title: "Source-backed notice",
  slug: "notice",
  summary: "A public update",
  category: "roads",
  severity: "useful",
  official_url: "https://example.test/notice",
  published_at: "2026-09-20T16:00:00Z",
  retrieved_at: "2026-10-02T16:00:00Z",
  verified_at: "2026-10-02T16:00:00Z",
  latitude: null,
  longitude: null,
  city: "Paris",
  tags_json: [],
  verification_status: "verified",
  confidence_score: 1,
  is_sample: false,
  ...changes,
});
const match = (n: Notice): Match => ({
  notice: n,
  relevance_score: 50,
  distance_km: null,
  location_id: null,
  match_reasons_json: [],
});

describe("genuine new-since-visit updates", () => {
  it("does not confuse verification, retrieval or database edits with publication", () => {
    expect(
      changedSinceVisit(
        notice({
          updated_at: "2026-10-02T17:00:00Z",
          created_at: "2026-10-02T17:00:00Z",
        }),
        checkpoint,
        now,
      ),
    ).toBe(false);
  });
  it("accepts verified publication or an explicit source update after the checkpoint", () => {
    expect(
      changedSinceVisit(
        notice({ published_at: "2026-10-02T16:00:00Z" }),
        checkpoint,
        now,
      ),
    ).toBe(true);
    expect(
      changedSinceVisit(
        notice({ source_updated_at: "2026-10-02T15:00:00Z" }),
        checkpoint,
        now,
      ),
    ).toBe(true);
    expect(
      changedSinceVisit(
        notice({ source_updated_at: checkpoint }),
        checkpoint,
        now,
      ),
    ).toBe(false);
  });
  it("never calls samples, pending review or first visits new", () => {
    const changed = { published_at: "2026-10-02T16:00:00Z" };
    expect(
      changedSinceVisit(
        notice({ ...changed, is_sample: true }),
        checkpoint,
        now,
      ),
    ).toBe(false);
    expect(
      changedSinceVisit(
        notice({ ...changed, verification_status: "needs_review" }),
        checkpoint,
        now,
      ),
    ).toBe(false);
    expect(changedSinceVisit(notice(changed), null, now)).toBe(false);
  });
  it("rejects invalid/future history and ignores invalid/future publication fields", () => {
    expect(validVisitCheckpoint("invalid", now)).toBeNull();
    expect(validVisitCheckpoint("2999-01-01T00:00:00Z", now)).toBeNull();
    expect(validVisitCheckpoint(checkpoint, now)).toBe(
      "2026-10-01T18:00:00.000Z",
    );
    expect(changedSinceVisit(notice(), "invalid", now)).toBe(false);
    expect(
      latestPublicChangeAt(
        notice({
          published_at: "invalid",
          source_updated_at: "2999-01-01T00:00:00Z",
        }),
        now,
      ),
    ).toBeNull();
    expect(
      changedSinceVisit(
        notice({
          published_at: "2026-10-02T16:00:00Z",
          source_updated_at: "invalid",
        }),
        checkpoint,
        now,
      ),
    ).toBe(true);
  });
  it("uses the later valid source-publication date even if source update predates it", () => {
    expect(
      changedSinceVisit(
        notice({
          published_at: "2026-10-02T16:00:00Z",
          source_updated_at: "2026-09-19T16:00:00Z",
        }),
        checkpoint,
        now,
      ),
    ).toBe(true);
  });
});

describe("truthful and disjoint Today sections", () => {
  it("only recognizes business openings explicitly tagged by editorial data", () => {
    expect(
      noticeKind(
        notice({ title: "New coffee shop opening", category: "other" }),
      ),
    ).toBe("community");
    expect(
      noticeKind(
        notice({ category: "downtown", tags_json: ["Business-Opening"] }),
      ),
    ).toBe("business");
    expect(
      noticeKind(notice({ category: "other", tags_json: ["new_business"] })),
    ).toBe("business");
    expect(
      noticeKind(
        notice({ category: "event", tags_json: ["business_opening"] }),
      ),
    ).toBe("event");
  });
  it("assigns new and existing notices once without repeating across sections", () => {
    const fresh = match(
      notice({ id: "new", published_at: "2026-10-02T16:00:00Z" }),
    );
    const road = match(notice({ id: "road" }));
    const event = match(notice({ id: "event", category: "event" }));
    const business = match(
      notice({
        id: "opening",
        category: "downtown",
        tags_json: ["business_opening"],
      }),
    );
    const groups = groupTodayMatches(
      [fresh, road, event, business, fresh],
      checkpoint,
      now,
    );
    expect(groups.new.map((value) => value.notice.id)).toEqual(["new"]);
    expect(groups.change.map((value) => value.notice.id)).toEqual(["road"]);
    expect(groups.event.map((value) => value.notice.id)).toEqual(["event"]);
    expect(groups.business.map((value) => value.notice.id)).toEqual([
      "opening",
    ]);
    expect(Object.values(groups).flat()).toHaveLength(4);
  });
});
