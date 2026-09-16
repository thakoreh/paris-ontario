import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("public sharing route integration", () => {
  it("gives each notice an explicit canonical public path rather than the browser address", () => {
    const detail = read("src/components/detail.tsx");

    expect(detail).toContain('from "./share-button"');
    expect(detail).toContain('publicPath={`/notice/${n.slug}`}');
    expect(detail).not.toContain("navigator.clipboard.writeText(window.location.href)");
  });

  it("shares the resource hub using its fixed public route", () => {
    const resourceHub = read("src/components/resource-hub.tsx");

    expect(resourceHub).toContain('from "./share-button"');
    expect(resourceHub).toContain('publicPath="/paris-ontario"');
  });

  it("shares the everyday-services guide using its fixed public route", () => {
    const services = read("src/components/resident-guide.tsx");

    expect(services).toContain('from "./share-button"');
    expect(services).toContain('publicPath="/services"');
  });

  it("keeps the manual sharing fallback within its parent on a narrow viewport", () => {
    const styles = read("src/app/globals.css");

    expect(styles).toContain(".share-control");
    expect(styles).toContain(".share-manual-link input");
    expect(styles).toContain("max-width: 100%");
  });
});
