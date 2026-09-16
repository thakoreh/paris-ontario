import { describe, expect, it } from "vitest";
import { canonicalShareUrl, sharePublicLink } from "@/lib/share-link";

describe("public sharing links", () => {
  it("shares the configured canonical notice URL before yielding to async work", async () => {
    const calls: Array<{ title: string; url: string }> = [];
    let released = false;
    const pending = sharePublicLink(
      {
        base: "https://parispulse.ca/",
        publicPath: "/notice/roadwork?utm_source=feed#details",
        title: "Roadwork update",
      },
      {
        share: async (data) => {
          calls.push(data);
          await Promise.resolve();
          released = true;
        },
      },
    );

    expect(calls).toEqual([
      { title: "Roadwork update", url: "https://parispulse.ca/notice/roadwork" },
    ]);
    expect(released).toBe(false);
    await expect(pending).resolves.toEqual({
      status: "shared",
      url: "https://parispulse.ca/notice/roadwork",
    });
  });

  it("does not copy a link after a visitor cancels native sharing", async () => {
    let copied = false;
    const result = await sharePublicLink(
      {
        base: "https://parispulse.ca",
        publicPath: "/paris-ontario",
        title: "Paris, Ontario resource guide",
      },
      {
        share: async () => {
          throw new DOMException("cancelled", "AbortError");
        },
        clipboard: {
          writeText: async () => {
            copied = true;
          },
        },
      },
    );

    expect(result).toEqual({
      status: "cancelled",
      url: "https://parispulse.ca/paris-ontario",
    });
    expect(copied).toBe(false);
  });

  it("copies the canonical guide URL when native sharing is unavailable", async () => {
    const copied: string[] = [];
    const result = await sharePublicLink(
      {
        base: "https://parispulse.ca",
        publicPath: "/paris-ontario?utm_source=sidebar#guide",
        title: "Paris, Ontario resource guide",
      },
      {
        clipboard: {
          writeText: async (url) => {
            copied.push(url);
          },
        },
      },
    );

    expect(result).toEqual({
      status: "copied",
      url: "https://parispulse.ca/paris-ontario",
    });
    expect(copied).toEqual(["https://parispulse.ca/paris-ontario"]);
  });

  it("returns a manual canonical link when clipboard access is denied", async () => {
    const result = await sharePublicLink(
      {
        base: "https://parispulse.ca",
        publicPath: "/notice/roadwork",
        title: "Roadwork update",
      },
      {
        clipboard: {
          writeText: async () => {
            throw new DOMException("denied", "NotAllowedError");
          },
        },
      },
    );

    expect(result).toEqual({
      status: "manual",
      url: "https://parispulse.ca/notice/roadwork",
    });
  });

  it("rejects non-public paths that could leave the canonical site", () => {
    expect(() => canonicalShareUrl("https://parispulse.ca", "//other.example/a")).toThrow(
      "site-relative path",
    );
    expect(() => canonicalShareUrl("http://parispulse.ca", "/notice/roadwork")).toThrow(
      "public HTTPS origin",
    );
  });
});
