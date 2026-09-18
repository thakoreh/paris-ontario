import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Deadline, Notice } from "@/types";

const mocks = vi.hoisted(() => ({ publicData: vi.fn() }));

vi.mock("@/lib/repository", () => ({ publicData: mocks.publicData }));

import sitemap, { buildSitemap } from "@/app/sitemap";

const notice = (overrides: Partial<Notice> = {}): Notice =>
  ({
    id: "notice-1",
    community_id: "community-1",
    source_id: "source-1",
    title: "Verified road update",
    slug: "verified-road-update",
    summary: "A verified road update.",
    category: "roads",
    severity: "info",
    official_url: "https://www.brant.ca/news/road-update",
    published_at: "2026-09-10T12:00:00.000Z",
    retrieved_at: "2026-09-10T13:00:00.000Z",
    verified_at: "2026-09-10T14:00:00.000Z",
    source_updated_at: "2026-09-11T12:00:00.000Z",
    end_at: "2099-09-12T00:00:00.000Z",
    expires_at: "2099-09-13T00:00:00.000Z",
    latitude: null,
    longitude: null,
    city: "Paris",
    tags_json: ["roads"],
    verification_status: "verified",
    confidence_score: 1,
    is_sample: false,
    ...overrides,
  }) as Notice;

const deadline = (overrides: Partial<Deadline> = {}): Deadline =>
  ({
    id: "deadline-1",
    community_id: "community-1",
    title: "Verified consultation deadline",
    description: "A verified deadline.",
    category: "planning",
    deadline_at: "2099-09-14T00:00:00.000Z",
    official_url: "https://www.brant.ca/consultations/one",
    latitude: null,
    longitude: null,
    source_id: "source-1",
    verified_at: "2026-09-10T14:00:00.000Z",
    is_sample: false,
    ...overrides,
  }) as Deadline;

const fixedNow = new Date("2026-09-15T12:00:00.000Z");

beforeEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = "https://parispulse.ca";
  mocks.publicData.mockReset();
});

describe("public sitemap coverage", () => {
  it("handles Next metadata-route params without treating them as the injected clock", async () => {
    const repositoryData = {
      notices: [],
      deadlines: [],
      sources: [],
      demo: false,
      error: null,
    };
    mocks.publicData.mockImplementation(async (nowDate = new Date()) => {
      nowDate.toISOString();
      return repositoryData;
    });

    const nextMetadataExport = sitemap as unknown as (
      params: { id?: string },
    ) => ReturnType<typeof sitemap>;

    await expect(nextMetadataExport({ id: undefined })).resolves.toHaveLength(15);
    expect(mocks.publicData).toHaveBeenCalledWith(expect.any(Date));
  });
  it("preserves all 15 static routes and adds only eligible dynamic records", async () => {
    mocks.publicData.mockResolvedValue({
      notices: [
        notice(),
        notice({ id: "notice-draft", slug: "draft", verification_status: "draft" }),
        notice({ id: "notice-sample", slug: "sample", is_sample: true }),
        notice({
          id: "notice-expired",
          slug: "expired",
          expires_at: "2020-01-01T00:00:00.000Z",
        }),
      ],
      deadlines: [
        deadline(),
        deadline({ id: "deadline-sample", is_sample: true }),
        deadline({ id: "deadline-unverified", verified_at: null }),
        deadline({ id: "deadline-past", deadline_at: "2020-01-01T00:00:00.000Z" }),
      ],
      sources: [],
      demo: false,
      error: null,
    });

    const entries = await buildSitemap(fixedNow);
    const urls = entries.map((entry) => entry.url);
    const staticUrls = urls.filter(
      (url) => !url.includes("/notice/") && !url.includes("/deadline/"),
    );

    expect(staticUrls).toHaveLength(15);
    expect(new Set(staticUrls).size).toBe(15);
    expect(urls).toEqual(
      expect.arrayContaining([
        "https://parispulse.ca/notice/verified-road-update",
        "https://parispulse.ca/deadline/deadline-1",
      ]),
    );
    expect(urls.some((url) => url.includes("/draft"))).toBe(false);
    expect(urls.some((url) => url.includes("/sample"))).toBe(false);
    expect(urls.some((url) => url.includes("/expired"))).toBe(false);
    expect(urls.some((url) => url.includes("deadline-unverified"))).toBe(false);
    expect(urls.some((url) => url.includes("deadline-past"))).toBe(false);
  });

  it("uses persisted source and verification timestamps instead of request time", async () => {
    mocks.publicData.mockResolvedValue({
      notices: [notice()],
      deadlines: [deadline()],
      sources: [],
      demo: false,
      error: null,
    });

    const entries = await buildSitemap(fixedNow);
    expect(entries.find((entry) => entry.url.endsWith("/notice/verified-road-update")))
      .toMatchObject({ lastModified: new Date("2026-09-11T12:00:00.000Z") });
    expect(entries.find((entry) => entry.url.endsWith("/deadline/deadline-1")))
      .toMatchObject({ lastModified: new Date("2026-09-10T14:00:00.000Z") });
  });

  it("excludes notices that are verified but not published yet", async () => {
    mocks.publicData.mockResolvedValue({
      notices: [notice({ id: "notice-future", slug: "future", published_at: "2999-01-01T00:00:00.000Z" })],
      deadlines: [],
      sources: [],
      demo: false,
      error: null,
    });

    const entries = await buildSitemap(new Date("2026-09-15T12:00:00.000Z"));
    expect(entries.some((entry) => entry.url.endsWith("/notice/future"))).toBe(false);
  });

  it("keeps static coverage but never substitutes preview records when the repository is unavailable", async () => {
    mocks.publicData.mockResolvedValue({
      notices: [],
      deadlines: [],
      sources: [],
      demo: false,
      error: "Local updates are temporarily unavailable.",
    });

    const entries = await buildSitemap(fixedNow);
    expect(entries).toHaveLength(15);
    expect(entries.every((entry) => !entry.url.includes("/notice/") && !entry.url.includes("/deadline/"))).toBe(true);
  });
});
