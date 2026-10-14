import { expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import sources from "../public/data/explore/sources.json";
import { visitingEntries } from "@/lib/explore-content";
import { createMiddleware } from "@/middleware";
import { NextRequest } from "next/server";
import { FAVICON_METADATA } from "@/lib/favicon";
it("ships attributed official geometry and lets its assets through middleware", async () => {
  for (const source of sources) {
    expect(source.checked).toBe("2026-10-14");
    expect(source.licence_note).toBe("County of Brant Open Data");
    const data = JSON.parse(readFileSync(`public${source.path}`, "utf8"));
    expect(data.type).toBe("FeatureCollection");
    expect(data.features.length).toBeGreaterThan(0);
    const response = await createMiddleware()(new NextRequest(`http://localhost${source.path}`));
    expect(response.status).toBe(200);
  }
});
it("links to the official stay guide without business listings", () => {
  expect(visitingEntries.find(e => e.id === "stay")).toMatchObject({ title: "Plan your stay", source_url: "https://www.brant.ca/Visit", reviewed_at: "2026-10-14" });
});
it("all root icon references exist", () => {
  for (const icon of [...FAVICON_METADATA.icon, ...FAVICON_METADATA.apple]) expect(existsSync(`public${icon.url}`)).toBe(true);
});

it("loads County geometry on demand and stops aborted requests", async () => {
  const { vi } = await import("vitest");
  const { loadExploreLayer } = await import("@/lib/explore-map-data");
  const data = JSON.parse(readFileSync(`public${sources[0].path}`, "utf8"));
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => data });
  vi.stubGlobal("fetch", fetcher);
  try {
    expect(fetcher).not.toHaveBeenCalled();
    expect(await loadExploreLayer(sources[0].path)).toEqual(data);
    expect(fetcher).toHaveBeenCalledWith(sources[0].path, { signal: undefined });
    const controller = new AbortController();
    controller.abort();
    fetcher.mockClear();
    await expect(loadExploreLayer(sources[0].path, controller.signal)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});
