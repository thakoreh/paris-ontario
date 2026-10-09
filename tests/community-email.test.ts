import { describe, expect, it } from "vitest";
import {
  MAX_MAILTO_URI_LENGTH,
  buildCommunityEmailDraft,
  buildCorrectionEmailDraft,
  normalizeSupportEmail,
} from "@/lib/community-email";

const support = "support@parispulse.ca";
const contribution = {
  title: "Café réunion — updated hours",
  body: "The café is changing its public hours next week. Please compare this detail with the organizer's announcement.",
  sourceUrl: "https://www.parisontario.ca/news/hours?date=2026-10-08",
};

describe("community email recipients", () => {
  it.each([
    ["support@parispulse.ca", "support@parispulse.ca"],
    ["  corrections+local@paris-pulse.ca ", "corrections+local@paris-pulse.ca"],
  ])("normalizes a strict public recipient: %s", (input, expected) => {
    expect(normalizeSupportEmail(input)).toBe(expected);
  });

  it.each([
    undefined,
    "",
    "support\r\nBcc: attacker@example.com",
    "support@example.com,attacker@example.com",
    "Paris Pulse <support@example.com>",
    "mailto:support@example.com",
    "support@例子.测试",
    "support @example.com",
    "support@example.com\n",
  ])("fails closed for an unsafe or missing recipient: %j", (input) => {
    expect(normalizeSupportEmail(input)).toBeNull();
  });
});

describe("bounded community email drafts", () => {
  it("encodes Unicode and line breaks without putting raw headers in the mailto URL", () => {
    const draft = buildCommunityEmailDraft(contribution, support);

    expect(draft).not.toBeNull();
    expect(draft?.mailto.startsWith("mailto:support%40parispulse.ca")).toBe(true);
    expect(draft?.mailto).not.toMatch(/[\r\n]/);
    expect(draft?.mailto).toContain("%C3%A9");
    expect(draft?.mailto).toContain("%E2%80%94");
    expect(draft?.fullText).toContain(contribution.title);
    expect(draft?.fullText).toContain(contribution.body);
    expect(draft?.fullText).toContain(contribution.sourceUrl);
  });

  it.each([
    ["title", (surrogate: string) => ({ ...contribution, title: `Update ${surrogate}` })],
    ["body", (surrogate: string) => ({ ...contribution, body: `Details ${surrogate}` })],
    [
      "source URL",
      (surrogate: string) => ({
        ...contribution,
        sourceUrl: `https://example.com/news/${surrogate}`,
      }),
    ],
  ])("fails closed instead of throwing for a lone %s surrogate", (_field, makeInput) => {
    for (const surrogate of ["\ud800", "\udc00"]) {
      let draft: ReturnType<typeof buildCommunityEmailDraft> = null;
      expect(() => {
        draft = buildCommunityEmailDraft(makeInput(surrogate), support);
      }).not.toThrow();
      expect(draft).toBeNull();
    }
  });

  it("preserves valid emoji in full details while keeping the mailto bounded", () => {
    const emojiContribution = {
      ...contribution,
      title: "🎉 Community update",
      body: "The café is hosting a 🎉 event next week. Please compare this detail with the organizer's announcement.",
    };
    const draft = buildCommunityEmailDraft(emojiContribution, support);

    expect(draft).not.toBeNull();
    expect(draft?.fullText).toContain(emojiContribution.title);
    expect(draft?.fullText).toContain(emojiContribution.body);
    expect(draft?.mailto).toContain("%F0%9F%8E%89");
    expect(draft?.mailto.length).toBeLessThanOrEqual(MAX_MAILTO_URI_LENGTH);
  });

  it.each([
    { title: "x".repeat(141) },
    { body: "x".repeat(2001) },
    { sourceUrl: `https://example.com/${"x".repeat(2041)}` },
  ])("rejects input outside the validated contribution bounds: %j", (change) => {
    expect(
      buildCommunityEmailDraft({ ...contribution, ...change }, support),
    ).toBeNull();
  });

  it("keeps the opening draft safely short while preserving every detail in the copy fallback", () => {
    const oversizedButValid = {
      title: "A detailed neighbourhood update",
      body: "é".repeat(2000),
      sourceUrl: `https://example.com/${"a".repeat(2000)}`,
    };
    const draft = buildCommunityEmailDraft(oversizedButValid, support);

    expect(draft).not.toBeNull();
    expect(draft?.wasTruncated).toBe(true);
    expect(draft?.mailto.length).toBeLessThanOrEqual(MAX_MAILTO_URI_LENGTH);
    expect(draft?.fullText).toContain(oversizedButValid.title);
    expect(draft?.fullText).toContain(oversizedButValid.body);
    expect(draft?.fullText).toContain(oversizedButValid.sourceUrl);
    expect(draft?.shortText).toMatch(/full details/i);
  });

  it("never lets a long recipient and CJK subject push the mailto past its hard bound", () => {
    const longRecipient = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(57)}.com`;
    const draft = buildCorrectionEmailDraft(
      {
        noticeTitle: "漢".repeat(200),
        noticeUrl: "https://parispulse.ca/notice/road-closure",
        sourceUrl: "https://www.brant.ca/roads/closures",
      },
      longRecipient,
    );

    expect(draft).not.toBeNull();
    expect(draft?.mailto.length).toBeLessThanOrEqual(MAX_MAILTO_URI_LENGTH);
  });

  it("does not present a clipped source URL as if it were a clickable source", () => {
    const sourceUrl = `https://www.brant.ca/${"a".repeat(2000)}`;
    const draft = buildCommunityEmailDraft(
      { ...contribution, sourceUrl },
      support,
    );

    expect(draft).not.toBeNull();
    expect(draft?.shortText).toContain("paste the full source URL from copyable details");
    expect(draft?.shortText).not.toContain(`Original source: ${sourceUrl.slice(0, 420)}`);
  });

  it("uses a source skeleton in correction drafts when the original URL cannot fit", () => {
    const sourceUrl = `https://www.brant.ca/${"a".repeat(2000)}`;
    const draft = buildCorrectionEmailDraft(
      {
        noticeTitle: "Road closure",
        noticeUrl: "https://parispulse.ca/notice/road-closure",
        sourceUrl,
      },
      support,
    );

    expect(draft).not.toBeNull();
    expect(draft?.shortText).toContain("paste the full source URL from copyable details");
    expect(draft?.shortText).not.toContain(`Original source: ${sourceUrl.slice(0, 420)}`);
  });

  it.each([
    "https://www.brant.ca:8443/news",
    "https://www.brant.ca/news?token=private",
    "https://www.brant.ca/news?api_key=private",
    "https://www.brant.ca/news#private",
  ])("rejects source URLs that the public contribution validator rejects: %s", (sourceUrl) => {
    expect(buildCommunityEmailDraft({ ...contribution, sourceUrl }, support)).toBeNull();
  });

  it("returns no draft when the configured support address is missing", () => {
    expect(buildCommunityEmailDraft(contribution, "")).toBeNull();
  });
});

describe("notice correction drafts", () => {
  it("uses only the canonical notice page, title and original source context", () => {
    const draft = buildCorrectionEmailDraft(
      {
        noticeTitle: "Road closure on Grand River Street",
        noticeUrl: "https://parispulse.ca/notice/grand-river-closure",
        sourceUrl: "https://www.brant.ca/roads/closures",
      },
      support,
    );

    expect(draft).not.toBeNull();
    expect(draft?.fullText).toContain("Road closure on Grand River Street");
    expect(draft?.fullText).toContain(
      "https://parispulse.ca/notice/grand-river-closure",
    );
    expect(draft?.fullText).toContain("https://www.brant.ca/roads/closures");
    expect(draft?.fullText).toContain("Please describe the correction");
    expect(draft?.fullText).not.toContain("saved locations");
    expect(draft?.fullText).not.toContain("radius");
  });

  it("fails closed for an untrusted notice URL or missing recipient", () => {
    expect(
      buildCorrectionEmailDraft(
        {
          noticeTitle: "Road closure",
          noticeUrl: "https://evil.example/redirect?to=parispulse.ca",
          sourceUrl: "https://www.brant.ca/roads/closures",
        },
        support,
      ),
    ).toBeNull();
    expect(
      buildCorrectionEmailDraft(
        {
          noticeTitle: "Road closure",
          noticeUrl: "https://parispulse.ca/notice/road-closure",
          sourceUrl: "https://www.brant.ca/roads/closures",
        },
        undefined,
      ),
    ).toBeNull();
  });
});
