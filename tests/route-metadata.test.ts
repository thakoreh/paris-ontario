import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Deadline, Notice } from "@/types";

const mocks = vi.hoisted(() => ({
  noticeBySlug: vi.fn(),
  deadlineById: vi.fn(),
  publicData: vi.fn(),
}));

vi.mock("@/lib/repository", () => mocks);

import { generateMetadata } from "@/app/[[...path]]/page";

const publicNotice = {
  id: "notice-1",
  title: "Powerline Road lighting installation",
  summary: "Work continues on Powerline Road through October 12.",
} as Notice;
const publicDeadline = {
  id: "deadline-1",
  title: "Planning feedback closes",
  description: "Written feedback is due before the consultation closes.",
} as Deadline;

beforeEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = "https://parispulse.ca";
  mocks.noticeBySlug.mockReset();
  mocks.deadlineById.mockReset();
  mocks.publicData.mockReset();
});

describe("route-aware social metadata", () => {
  it("emits canonical OG and large Twitter metadata for a public guide", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ path: ["paris-ontario"] }),
    });

    expect(metadata.title).toBe("Paris, Ontario resource guide");
    expect(metadata.description).toContain("Source-linked guides");
    expect(metadata.alternates).toEqual({ canonical: "/paris-ontario" });
    expect(metadata.openGraph).toMatchObject({
      title: "Paris, Ontario resource guide",
      description: expect.stringContaining("Source-linked guides"),
      url: "https://parispulse.ca/paris-ontario",
      images: [
        expect.objectContaining({
          url: "https://parispulse.ca/opengraph-image",
          width: 1200,
          height: 630,
        }),
      ],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Paris, Ontario resource guide",
      images: ["https://parispulse.ca/opengraph-image"],
    });
  });

  it("uses each public notice and deadline detail as its own OG identity", async () => {
    mocks.noticeBySlug.mockResolvedValue(publicNotice);
    const noticeMetadata = await generateMetadata({
      params: Promise.resolve({ path: ["notice", "powerline-road"] }),
    });
    expect(noticeMetadata.title).toBe(publicNotice.title);
    expect(noticeMetadata.description).toBe(publicNotice.summary);
    expect(noticeMetadata.openGraph).toMatchObject({
      title: publicNotice.title,
      description: publicNotice.summary,
      url: "https://parispulse.ca/notice/powerline-road",
    });

    mocks.deadlineById.mockResolvedValue(publicDeadline);
    const deadlineMetadata = await generateMetadata({
      params: Promise.resolve({ path: ["deadline", publicDeadline.id] }),
    });
    expect(deadlineMetadata.title).toBe(publicDeadline.title);
    expect(deadlineMetadata.description).toBe(publicDeadline.description);
    expect(deadlineMetadata.openGraph).toMatchObject({
      title: publicDeadline.title,
      description: publicDeadline.description,
      url: `https://parispulse.ca/deadline/${publicDeadline.id}`,
    });
  });

  it("keeps private app routes noindex and without a public canonical", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ path: ["app"] }),
    });

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toBeNull();
    expect(metadata.openGraph).toBeNull();
    expect(metadata.twitter).toBeNull();
    expect(mocks.noticeBySlug).not.toHaveBeenCalled();
    expect(mocks.deadlineById).not.toHaveBeenCalled();
  });

  it("does not create an indexable canonical for an unpublished detail", async () => {
    mocks.noticeBySlug.mockResolvedValue(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ path: ["notice", "unpublished"] }),
    });

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toBeNull();
    expect(metadata.openGraph).toBeNull();
    expect(metadata.twitter).toBeNull();
  });
});
