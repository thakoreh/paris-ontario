import { describe, expect, it } from "vitest";
import { upcomingDeadlines } from "@/lib/relevance";

describe("upcoming deadlines", () => {
  it("includes now but excludes the seven-day boundary", () => {
    const now = new Date("2026-09-15T16:00:00Z");
    const items = [
      { deadline_at: "2026-09-15T16:00:00Z" },
      { deadline_at: "2026-09-22T15:59:59Z" },
      { deadline_at: "2026-09-22T16:00:00Z" },
    ];
    expect(upcomingDeadlines(items, now)).toEqual(items.slice(0, 2));
    expect(items).toHaveLength(3);
  });
  it("excludes passed and invalid dates from the next seven days", () => {
    const now = new Date("2026-09-15T16:00:00Z");
    const items = [
      { deadline_at: "2026-09-14T16:00:00Z" },
      { deadline_at: "2026-09-16T16:00:00Z" },
      { deadline_at: "2026-09-24T16:00:00Z" },
      { deadline_at: "invalid" },
    ];
    expect(upcomingDeadlines(items, now)).toEqual([items[1]]);
  });
});
