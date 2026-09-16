import { describe, expect, it } from "vitest";
import { filterParisResources, parisResources } from "@/data/paris-resources";

describe("Paris Ontario resource finder", () => {
  it("keeps a small set of distinct official-source guides discoverable by task", () => {
    expect(parisResources.map((resource) => resource.id)).toEqual([
      "outdoors",
      "getting-around",
      "family-recreation",
      "settling-in",
    ]);
    expect(filterParisResources("trail").map((resource) => resource.id)).toEqual([
      "outdoors",
    ]);
    expect(filterParisResources("parking").map((resource) => resource.id)).toEqual([
      "getting-around",
    ]);
    expect(filterParisResources("no matching task")).toEqual([]);
  });

  it("requires a source URL and a fixed editorial review date for each guide", () => {
    for (const resource of parisResources) {
      expect(resource.sources.length).toBeGreaterThan(0);
      expect(resource.sources.every((source) => source.url.startsWith("https://"))).toBe(true);
      expect(resource.reviewedAt).toBe("2026-09-15");
    }
  });
});
