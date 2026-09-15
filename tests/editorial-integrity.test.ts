import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

describe("editorial integrity", () => {
  it("records a source review only when an editor publishes a verified notice", () => {
    const route = fs.readFileSync(
      path.join(root, "src/app/api/admin/route.ts"),
      "utf8",
    );
    expect(route).toContain('input.verification_status === "verified"');
    expect(route).toContain('.from("official_sources")');
    expect(route).toContain("last_checked_at: now");
    expect(route).toContain("last_success_at: now");
  });

  it("keeps launch data separate from fictional demo fixtures", () => {
    const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
    expect(readme).toContain("initial-verified-paris-notices.sql");
    expect(readme).toContain("Do not use `npm run db:seed` for production");
  });
});
