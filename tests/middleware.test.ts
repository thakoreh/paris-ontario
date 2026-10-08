import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ createServerClient: vi.fn() }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

import { createMiddleware } from "@/middleware";

describe("middleware public deadline eligibility", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    vi.clearAllMocks();
  });

  it.each(["/app/area", "/share-update", "/admin/submissions"])("allows the new registered route %s through to its page guard", async (path) => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const response = await createMiddleware()(new NextRequest(`http://localhost${path}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("uses the injected clock and strict greater-than query for deadline details", async () => {
    const now = new Date("2099-01-01T00:00:00.000Z");
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    mocks.createServerClient.mockReturnValue({
      from: vi.fn().mockReturnValue(query),
    });

    const middleware = createMiddleware(() => now);
    const response = await middleware(
      new NextRequest(
        "http://localhost/deadline/da111111-1111-4111-8111-111111111111",
      ),
    );

    expect(response.status).toBe(404);
    expect(query.gt).toHaveBeenCalledWith("deadline_at", now.toISOString());
    expect(query.gte).not.toHaveBeenCalled();
  });
});
