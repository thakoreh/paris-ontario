import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";

const fetchMock = vi.fn();
const healthy = () =>
  new Response(null, {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockImplementation(async () => healthy());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("public backend readiness", () => {
  it("returns 503 without configuration and makes no request", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      dataMode: "preview",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("checks all public tables with bounded anonymous HEAD reads; empty data is healthy", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      readiness: "ready",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => url.pathname)).toEqual([
      "/rest/v1/notices",
      "/rest/v1/deadlines",
      "/rest/v1/official_sources",
    ]);
    for (const [url, options] of fetchMock.mock.calls) {
      expect(url.searchParams.get("select")).toBe("id");
      expect(url.searchParams.get("limit")).toBe("1");
      expect(options).toMatchObject({
        method: "HEAD",
        cache: "no-store",
        redirect: "error",
        headers: {
          apikey: "public-test-key",
          Authorization: "Bearer public-test-key",
        },
      });
    }
  });

  it.each([401, 403, 500, 503])(
    "reports unavailable for backend HTTP %s",
    async (status) => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status }));
      const response = await GET();
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        ok: false,
        dataMode: "supabase",
      });
    },
  );

  it("rejects unexpected successful HTML responses", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );
    expect((await GET()).status).toBe(503);
  });

  it("does not leak upstream exceptions or configuration", async () => {
    fetchMock.mockRejectedValueOnce(
      new Error("secret-key and private database detail"),
    );
    const response = await GET();
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).not.toContain("secret-key");
    expect(text).not.toContain("project.supabase.co");
    expect(text).not.toContain("public-test-key");
  });

  it("returns within three seconds and aborts stalled requests", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(() => new Promise(() => {}));
    const pending = GET();
    await vi.advanceTimersByTimeAsync(3_000);
    const response = await pending;
    expect(response.status).toBe(503);
    for (const [, options] of fetchMock.mock.calls)
      expect(options.signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the timeout after success", async () => {
    vi.useFakeTimers();
    expect((await GET()).status).toBe(200);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects malformed and credential-bearing backend URLs without requests", async () => {
    for (const url of [
      "invalid",
      "https://user:password@project.supabase.co",
      "file:///tmp/db",
    ]) {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
      expect((await GET()).status).toBe(503);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
