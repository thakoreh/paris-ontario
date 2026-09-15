import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ serverClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ serverClient: mocks.serverClient }));

import { deadlineById, noticeBySlug, publicData } from "@/lib/repository";

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
    const data = await publicData();
    expect(data.error).toBeNull();
    expect(data.demo).toBe(false);
    expect(data.notices).toHaveLength(1);
    expect(data.notices[0]).toMatchObject({
      is_sample: false,
      verification_status: "verified",
      city: "Paris",
    });
    await expect(noticeBySlug(data.notices[0].slug)).resolves.toMatchObject({
      id: data.notices[0].id,
    });
  });
});
