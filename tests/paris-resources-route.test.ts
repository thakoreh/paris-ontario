import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Paris Ontario resource hub route", () => {
  it("is public, rendered by the catch-all route, and linked from shared navigation", () => {
    expect(read("src/middleware.ts")).toContain('"/paris-ontario"');
    expect(read("src/app/[[...path]]/page.tsx")).toContain('route === "paris-ontario"');
    expect(read("src/components/shell.tsx")).toContain('"/paris-ontario"');
  });
});
