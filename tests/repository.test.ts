import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ serverClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ serverClient: mocks.serverClient }));

import { deadlineById, noticeBySlug, publicData } from "@/lib/repository";

const futureNotice = {
  id: "notice-future",
  community_id: "community-1",
  source_id: "source-1",
  title: "Future notice",
  slug: "future-notice",
  summary: "Not public yet.",
  category: "roads",
  severity: "info",
  official_url: "https://www.brant.ca/news/future-notice",
  published_at: "2999-01-01T00:00:00.000Z",
  retrieved_at: "2026-09-15T12:00:00.000Z",
  verified_at: "2026-09-15T13:00:00.000Z",
  end_at: "2999-01-02T00:00:00.000Z",
  expires_at: "2999-01-03T00:00:00.000Z",
  latitude: null,
  longitude: null,
  city: "Paris",
  tags_json: [],
  verification_status: "verified",
  confidence_score: 1,
  is_sample: false,
};

function noticeQuery(data: unknown) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
  };
  return builder;
}

function listQuery(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

function deadlineQuery(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

beforeEach(() => {
  delete process.env.PARIS_PULSE_TEST_MODE;
  mocks.serverClient.mockResolvedValue(null);
});

afterEach(() => {
  delete process.env.PARIS_PULSE_TEST_MODE;
});

describe("public data safety", () => {
  it("never serves sample content when the data backend is unavailable", async () => {
    await expect(publicData()).resolves.toEqual({
      notices: [],
      deadlines: [],
      sources: [],
      demo: false,
      error: "Local updates are temporarily unavailable.",
    });
  });

  it("does not resolve sample notice or deadline detail routes", async () => {
    await expect(noticeBySlug("sample-notice")).resolves.toBeNull();
    await expect(deadlineById("00000000-0000-4000-8000-000000000000")).resolves.toBeNull();
  });

  it("uses reviewed preview records only in explicit non-production test mode", async () => {
    process.env.PARIS_PULSE_TEST_MODE = "1";
    const now = new Date("2026-09-20T12:00:00.000Z");
    const data = await publicData(now);
    expect(data.error).toBeNull();
    expect(data.demo).toBe(false);
    expect(data.notices).toHaveLength(1);
    expect(data.notices[0]).toMatchObject({
      is_sample: false,
      verification_status: "verified",
      city: "Paris",
    });
    await expect(noticeBySlug(data.notices[0].slug, now)).resolves.toMatchObject({
      id: data.notices[0].id,
    });
  });

  it("does not resolve a preview deadline at its exact injected deadline", async () => {
    process.env.PARIS_PULSE_TEST_MODE = "1";
    const now = new Date("2026-10-13T03:59:59.000Z");

    await expect(
      deadlineById("da111111-1111-4111-8111-111111111111", now),
    ).resolves.toBeNull();
  });

  it("uses a strict future deadline query and injected clock for database details", async () => {
    const deadline = {
      id: "deadline-boundary",
      deadline_at: "2099-01-01T00:00:00.000Z",
      verified_at: "2098-01-01T00:00:00.000Z",
      is_sample: false,
    };
    const query = deadlineQuery(deadline);
    mocks.serverClient.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });

    const now = new Date(deadline.deadline_at);
    await expect(deadlineById(deadline.id, now)).resolves.toBeNull();
    expect(query.gt).toHaveBeenCalledWith("deadline_at", now.toISOString());
    expect(query.gte).not.toHaveBeenCalled();
  });

  it("does not resolve a future-published notice detail", async () => {
    const query = noticeQuery(futureNotice);
    mocks.serverClient.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });

    await expect(
      noticeBySlug("future-notice", new Date("2026-09-15T12:00:00.000Z")),
    ).resolves.toBeNull();
  });

  it("does not expose a future-published notice through public data", async () => {
    const notices = listQuery([futureNotice]);
    const deadlines = listQuery([]);
    const sources = listQuery([]);
    mocks.serverClient.mockResolvedValue({
      from: vi.fn((table: string) =>
        table === "notices" ? notices : table === "deadlines" ? deadlines : sources,
      ),
    });

    const data = await publicData(new Date("2026-09-15T12:00:00.000Z"));
    expect(data.notices).toEqual([]);
    expect(notices.lte).toHaveBeenCalledWith(
      "published_at",
      "2026-09-15T12:00:00.000Z",
    );
  });
});
