import { describe, expect, it } from "vitest";
import {
  canonicalShareUrl,
  copyPublicLink,
  noticeSharePath,
  shareChannelUrl,
  sharePublicLink,
} from "@/lib/share-link";

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

  it("creates one encoded public notice path segment for contextual cards", () => {
    expect(noticeSharePath("Road closure / King Street")).toBe(
      "/notice/Road%20closure%20%2F%20King%20Street",
    );
  });

  it("builds deliberate WhatsApp and email links from the clean canonical URL", () => {
    const input = {
      base: "https://parispulse.ca",
      publicPath: "/notice/road closure?utm_source=feed#details",
      title: "Road closure & parking",
    };

    const whatsappUrl = shareChannelUrl("whatsapp", input);
    expect(whatsappUrl).not.toBeNull();
    const whatsapp = new URL(whatsappUrl!);
    expect(whatsapp.origin).toBe("https://wa.me");
    expect(whatsapp.searchParams.get("text")).toBe(
      "Road closure & parking\nhttps://parispulse.ca/notice/road%20closure",
    );

    expect(shareChannelUrl("email", input)).toBe(
      "mailto:?subject=Road%20closure%20%26%20parking&body=Road%20closure%20%26%20parking%0A%0Ahttps%3A%2F%2Fparispulse.ca%2Fnotice%2Froad%2520closure",
    );
  });

  it("fails closed for an HTTP app URL instead of throwing while rendering channel links", () => {
    const input = {
      base: "http://localhost:3000",
      publicPath: "/notice/roadwork",
      title: "Roadwork update",
    };

    expect(shareChannelUrl("whatsapp", input)).toBeNull();
    expect(shareChannelUrl("email", input)).toBeNull();
  });

  it("fails closed when a title cannot be URI encoded", () => {
    const input = {
      base: "https://parispulse.ca",
      publicPath: "/notice/roadwork",
      title: "Roadwork \uD800",
    };

    expect(shareChannelUrl("whatsapp", input)).toBeNull();
    expect(shareChannelUrl("email", input)).toBeNull();
  });

  it("keeps an explicit copy choice manual when clipboard access is denied", async () => {
    const result = await copyPublicLink(
      {
        base: "https://parispulse.ca",
        publicPath: "/notice/roadwork?secret=should-not-share",
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

  it("rejects slash-backslash paths that URL parsing would normalize off-site", () => {
    expect(() => canonicalShareUrl("https://parispulse.ca", "/\\outside.invalid/")).toThrow(
      "site-relative path",
    );
  });

  it("rejects control characters before URL parsing can normalize them", () => {
    expect(() => canonicalShareUrl("https://parispulse.ca", "/notice\nroadwork")).toThrow(
      "site-relative path",
    );
  });
});
