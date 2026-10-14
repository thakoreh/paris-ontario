import { describe, expect, it, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({ publicData: vi.fn() }));
vi.mock("@/lib/repository", () => ({ publicData: mocks.publicData }));
import { GET } from "@/app/api/explore/route";
import { metadata as explore } from "@/app/explore/page";
import { metadata as trails } from "@/app/explore/trails/page";
import { metadata as visiting } from "@/app/explore/visiting/page";
import { metadata as council } from "@/app/services/council/page";
import fs from "node:fs";
beforeEach(() => {
  mocks.publicData.mockReset();
});
describe("Explore route contract", () => {
  it("gives every dedicated public route a canonical and description", () => {
    for (const [metadata, route] of [
      [explore, "/explore"],
      [trails, "/explore/trails"],
      [visiting, "/explore/visiting"],
      [council, "/services/council"],
    ] as const) {
      expect(metadata.alternates?.canonical).toBe(route);
      expect(metadata.description).toBeTruthy();
      expect(metadata.title).toBeTruthy();
    }
  });
  it("returns only repository-gated public map data", async () => {
    mocks.publicData.mockResolvedValue({ notices: [], error: null });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ notices: [] });
  });
  it("uses a retryable status without leaking repository errors", async () => {
    mocks.publicData.mockResolvedValue({ error: "private error details" });
    expect((await GET()).status).toBe(503);
    mocks.publicData.mockRejectedValue(new Error("private error details"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Notice map unavailable" });
  });
  it("provides Retry on map and route failures, and hides empty council sections", () => {
    const read = (path: string) => fs.readFileSync(path, "utf8");
    expect(read("src/app/error.tsx")).toContain("Retry");
    expect(read("src/components/notice-map.tsx")).toContain("setRetryKey");
    expect(read("src/components/explore-page.tsx")).toContain("setRetryKey");
    const page = read("src/app/services/council/page.tsx");
    expect(page).toContain("committees.length > 0");
    expect(page).toContain("decisions.length > 0");
    expect(page).not.toMatch(/Oct 26|How to vote|Municipal election:/);
  });
});
