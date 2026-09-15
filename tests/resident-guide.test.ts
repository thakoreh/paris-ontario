import { describe, expect, it } from "vitest";
import { residentServices, filterServices } from "@/data/resident-services";

describe("resident service finder", () => {
  it("finds a service by resident language and combines the category filter", () => {
    expect(filterServices("  trash  ", "all").map((s) => s.id)).toEqual([
      "waste",
    ]);
    expect(filterServices("trash", "Getting around")).toEqual([]);
    expect(filterServices("", "all")).toEqual(residentServices);
    expect(filterServices("no-matching-service", "all")).toEqual([]);
  });
});
