import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const seedDirectory = path.join(root, "supabase", "seed");
const productionSeeds = [
  "2026-09-14-initial-verified-paris-notices.sql",
  "2026-09-14-verified-paris-data-expansion.sql",
];

function seed(name: string) {
  return fs.readFileSync(path.join(seedDirectory, name), "utf8");
}

describe("production seed integrity", () => {
  it("preserves the real editorial review time instead of treating a later SQL import as a review", () => {
    for (const name of productionSeeds) {
      const contents = seed(name);
      expect(contents).toMatch(/Sources checked on 2026-09-15\./);
      expect(contents).not.toMatch(/retrieved_at, verified_at, now\(\), now\(\)/);
      expect(contents).not.toMatch(/last_checked_at, last_success_at, now\(\), now\(\)/);
      expect(contents).not.toMatch(/source_id, verified_at, is_sample\s*\n\).*now\(\), false/);
    }
  });

  it("requires every seeded public notice to retain a direct HTTPS source URL", () => {
    for (const name of productionSeeds) {
      const contents = seed(name);
      const noticeUrls = [...contents.matchAll(/https:\/\/[^'\s]+/g)].map(
        ([url]) => url,
      );
      expect(noticeUrls.length).toBeGreaterThan(0);
      expect(noticeUrls.every((url) => url.startsWith("https://"))).toBe(true);
    }
  });
});
