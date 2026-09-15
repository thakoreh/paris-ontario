import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("live-content route quality", () => {
  it("rejects an unknown content route before querying public data", () => {
    const page = read("src/app/[[...path]]/page.tsx");
    const guard = page.indexOf("if (!isKnownContentRoute(path)) notFound();");
    const publicData = page.indexOf("const data = await publicData();");

    expect(guard).toBeGreaterThanOrEqual(0);
    expect(guard).toBeLessThan(publicData);
  });

  it("does not describe the live product as a sample-data preview", () => {
    const publicPages = read("src/components/public-pages.tsx");
    const detail = read("src/components/detail.tsx");
    const feed = read("src/components/feed.tsx");

    expect(publicPages).not.toMatch(/fictional notice|sample content|Sample data/i);
    expect(detail).not.toMatch(/Sample dates are fictional/i);
    expect(feed).not.toMatch(/Get your daily email updates/i);
  });

  it("does not call the protected admin API for a visitor without editor access", () => {
    const admin = read("src/components/admin.tsx");

    expect(admin).toContain('if (!p.ready) return;');
    expect(admin).toContain('if (!p.profile || !["editor", "admin"].includes(p.profile.role))');
  });

  it("does not let editors create fictional records", () => {
    const admin = read("src/components/admin.tsx");

    expect(admin).toContain("row.is_sample = false;");
    expect(admin).not.toContain("Sample data (fictional demonstration)");
  });

  it("labels the mixed deadline and event calendar accurately", () => {
    const detail = read("src/components/detail.tsx");

    expect(detail).toContain('"Dates worth keeping."');
    expect(detail).not.toContain('"Deadlines coming up."');
  });
});
