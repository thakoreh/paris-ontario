import { describe, expect, it } from "vitest";
import type { Deadline, Notice } from "@/types";
import { isPublicDeadline, isPublicNotice } from "@/lib/public-content";

const notice = (published_at: string): Notice =>
  ({
    id: "notice-1",
    community_id: "community-1",
    source_id: "source-1",
    title: "Verified notice",
    slug: "verified-notice",
    summary: "A verified notice.",
    category: "roads",
    severity: "info",
    official_url: "https://www.brant.ca/news/notice",
    published_at,
    retrieved_at: "2026-09-15T12:00:00.000Z",
    verified_at: "2026-09-15T13:00:00.000Z",
    end_at: "2099-09-15T00:00:00.000Z",
    expires_at: "2099-09-16T00:00:00.000Z",
    latitude: null,
    longitude: null,
    city: "Paris",
    tags_json: [],
    verification_status: "verified",
    confidence_score: 1,
    is_sample: false,
  }) as Notice;

describe("public notice eligibility", () => {
  it("rejects a verified notice published after the injected current time", () => {
    const now = new Date("2026-09-15T12:00:00.000Z");
    expect(isPublicNotice(notice("2026-09-15T12:00:00.001Z"), now)).toBe(false);
  });
});

describe("public deadline eligibility", () => {
  it("requires a deadline to be strictly after the injected current time", () => {
    const now = new Date("2026-09-15T12:00:00.000Z");
    const deadline = {
      deadline_at: now.toISOString(),
      verified_at: "2026-09-15T11:00:00.000Z",
      is_sample: false,
    } as Deadline;

    expect(isPublicDeadline(deadline, now)).toBe(false);
    expect(
      isPublicDeadline(
        { ...deadline, deadline_at: "2026-09-15T12:00:00.001Z" },
        now,
      ),
    ).toBe(true);
  });
});