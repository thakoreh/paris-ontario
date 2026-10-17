import React from "react";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultPreferences } from "@/config/community";
import { NoticeDetail } from "@/components/detail";
import { TrustPage } from "@/components/trust-pages";
import type { Notice } from "@/types";
import { buildCommunityEmailDraft, buildCorrectionEmailDraft, normalizeSupportEmail } from "@/lib/community-email";

vi.mock("@/components/provider", () => ({
  usePersonal: () => ({
    locations: [], preferences: defaultPreferences, saved: [], read: [],
  }),
}));
vi.mock("@/components/map-panel", () => ({ MapPanel: () => null }));

const legacyRecipient = "privacy-canary@example.invalid";
const notice: Notice = {
  id: "notice", community_id: "paris", source_id: "source",
  title: "Source-backed notice", slug: "source-backed-notice",
  summary: "A public update", category: "roads", severity: "useful",
  official_url: "https://www.brant.ca/news/notice",
  published_at: "2026-10-15T12:00:00Z", retrieved_at: "2026-10-15T12:00:00Z",
  verified_at: "2026-10-15T12:00:00Z", latitude: null, longitude: null,
  city: "Paris", tags_json: [], verification_status: "verified",
  confidence_score: 1, is_sample: false,
};

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_SUPPORT_EMAIL", legacyRecipient));
afterEach(() => vi.unstubAllEnvs());

function expectNoRecipient(html: string) {
  expect(html).not.toContain(legacyRecipient);
  expect(html).not.toContain(encodeURIComponent(legacyRecipient));
  expect(html).not.toContain("Recipient:");
  // Recipient-free sharing remains available to the resident.
  expect(html).not.toMatch(/href="mailto:[^?]/i);
  expect(html).not.toContain("Open correction email");
  expect(html).not.toContain("Open email draft");
  expect(html).not.toContain("<form");
}

describe("public contact privacy with a populated legacy setting", () => {
  it("renders an honest unavailable correction state and preserves the original source", () => {
    const html = renderToStaticMarkup(<NoticeDetail notice={notice} />);
    expect(html).toContain('aria-label="Suggest a correction"');
    expect(html).toContain("Correction requests are currently unavailable");
    expect(html).toContain(`href="${notice.official_url}"`);
    expect(html).toContain("Open original source");
    expectNoRecipient(html);
  });

  it.each(["contact", "privacy"] as const)("keeps %s copy consistent without a contact recipient", (kind) => {
    const html = renderToStaticMarkup(<TrustPage kind={kind} />);
    expect(html).toContain("Correction requests");
    expect(html).toContain("currently unavailable");
    expect(html).toContain("Support requests are currently unavailable");
    expectNoRecipient(html);
  });

  it("never implicitly reads a public recipient in the retained pure draft helpers", () => {
    expect(normalizeSupportEmail()).toBeNull();
    expect(buildCommunityEmailDraft({ title: "Public update", body: "Source-backed public details", sourceUrl: notice.official_url })).toBeNull();
    expect(buildCorrectionEmailDraft({ noticeTitle: notice.title, noticeUrl: `https://parispulse.ca/notice/${notice.slug}`, sourceUrl: notice.official_url })).toBeNull();
  });

  it("keeps the legacy public setting out of application code so Next cannot inline it", () => {
    function check(directory: string) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const file = join(directory, entry.name);
        if (entry.isDirectory()) check(file);
        else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
          expect(readFileSync(file, "utf8"), file).not.toContain("NEXT_PUBLIC_SUPPORT_EMAIL");
        }
      }
    }
    check("src");
  });
});
