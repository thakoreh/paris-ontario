import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FAVICON_METADATA } from "@/lib/favicon";

const root = path.resolve(__dirname, "..");
const publicPath = (file: string) => path.join(root, "public", file);

function pngDimensions(file: string) {
  const bytes = fs.readFileSync(publicPath(file));
  expect(bytes.subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  expect(bytes.toString("ascii", 12, 16)).toBe("IHDR");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("favicon assets", () => {
  it("ships square raster fallbacks at crawl-friendly sizes", () => {
    expect(pngDimensions("icon-192.png")).toEqual({ width: 192, height: 192 });
    expect(pngDimensions("apple-touch-icon.png")).toEqual({ width: 180, height: 180 });
  });

  it("ships a valid ICO fallback with the branded square icon", () => {
    const bytes = fs.readFileSync(publicPath("favicon.ico"));
    expect(bytes.readUInt16LE(0)).toBe(0);
    expect(bytes.readUInt16LE(2)).toBe(1);
    expect(bytes.readUInt16LE(4)).toBeGreaterThan(0);
    expect(bytes[6]).toBe(48);
    expect(bytes[7]).toBe(48);
  });

  it("publishes one stable branded icon set through Next metadata", () => {
    const iconEntries = Array.isArray(FAVICON_METADATA.icon)
      ? FAVICON_METADATA.icon
      : [FAVICON_METADATA.icon];
    const appleEntries = Array.isArray(FAVICON_METADATA.apple)
      ? FAVICON_METADATA.apple
      : [FAVICON_METADATA.apple];

    expect(iconEntries.map((entry) => entry.url)).toEqual([
      "/favicon.ico",
      "/icon-192.png",
      "/icon.svg",
    ]);
    expect(appleEntries.map((entry) => entry.url)).toEqual([
      "/apple-touch-icon.png",
    ]);
    expect(fs.readFileSync(publicPath("icon.svg"), "utf8")).toMatch(
      /viewBox="0 0 64 64"/,
    );
  });

  it("keeps every favicon URL outside auth and not-found middleware", () => {
    const middleware = fs.readFileSync(
      path.join(root, "src", "middleware.ts"),
      "utf8",
    );
    for (const asset of [
      "favicon.ico",
      "icon.svg",
      "icon-192.png",
      "apple-touch-icon.png",
      "manifest.webmanifest",
    ]) {
      expect(middleware).toContain(asset);
    }
  });
});
