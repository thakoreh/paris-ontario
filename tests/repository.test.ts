import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ serverClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ serverClient: mocks.serverClient }));

import { deadlineById, noticeBySlug, publicData } from "@/lib/repository";

beforeEach(() => {
  mocks.serverClient.mockResolvedValue(null);
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
});
