import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  communitySubmissionSchema,
  submissionReviewSchema,
} from "@/lib/community-submissions";
import {
  isSubmissionOrigin,
  MAX_SUBMISSION_BODY_BYTES,
  readSubmissionJson,
  submissionClientHash,
  submissionConfig,
  submissionOrigin,
} from "@/lib/submission-server";

const valid = {
  title: "Bridge repairs next week",
  body: "The municipal notice describes upcoming bridge repairs.",
  category: "roads",
  area: "downtown",
  source_url: "https://www.brant.ca/closures?date=2026-10-05",
  public_details_only: true,
  website: "",
};
const origin = "https://parispulse.ca";
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", origin);
  vi.stubEnv("COMMUNITY_SUBMISSIONS_ENABLED", "true");
  vi.stubEnv("SUBMISSION_TRUSTED_IP_HEADER", "x-real-ip");
  vi.stubEnv("SUBMISSION_RATE_LIMIT_SALT", "private-test-salt-".repeat(4));
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://database.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
});
afterEach(() => vi.unstubAllEnvs());

describe("strict public evidence schema", () => {
  it("accepts and trims evidence without inventing a publishing state", () => {
    expect(
      communitySubmissionSchema.parse({
        ...valid,
        title: ` ${valid.title} `,
        body: ` ${valid.body} `,
      }),
    ).toEqual(valid);
  });
  it.each([
    { status: "ready" },
    { status: "published" },
    { severity: "urgent" },
    { moderated_by: "editor" },
    { contact_email: "resident@example.com" },
    { user_id: "resident" },
    { latitude: 43.2 },
    { public_details_only: false },
    { public_details_only: undefined },
    { website: "spam.example.com" },
    { category: "emergency" },
    { area: "brantford" },
    { area: "" },
    { source_url: "" },
    { title: "short" },
    { title: "x".repeat(141) },
    { body: "short" },
    { body: "x".repeat(2001) },
    { title: "Multiple\nlines" },
    { title: "Control\tcharacter" },
    { body: "Control \u0001 character in an otherwise long body." },
  ])(
    "rejects missing evidence, private identifiers, abuse or client privilege fields: %j",
    (change) => {
      expect(
        communitySubmissionSchema.safeParse({ ...valid, ...change }).success,
      ).toBe(false);
    },
  );
  it.each([
    "not a url",
    "http://www.brant.ca/notice",
    "javascript:alert(1)",
    "https://user:password@www.brant.ca/notice",
    "https://127.0.0.1/notice",
    "https://127.1/notice",
    "https://2130706433/notice",
    "https://0x7f000001/notice",
    "https://192.168.1.1/notice",
    "https://8.8.8.8/notice",
    "https://[::1]/notice",
    "https://[2001:db8::1]/notice",
    "https://printer/notice",
    "https://service.local/notice",
    "https://service.local./notice",
    "https://www.brant.ca:8443/notice",
    "https://www.brant.ca/notice#secret",
    "https://www.brant.ca/notice?token=private",
    "https://www.brant.ca/notice?api_key=private",
    "https://www.brant.ca/notice?AUTH=private",
    "https://www.brant.ca/notice?X-Amz-Signature=private",
    "https://www.brant.ca/notice?code=private",
    "https://www.brant.ca/a\\b",
    "https://www.brant.ca/a b",
  ])(
    "rejects unsafe, private or credential-bearing source %s without throwing",
    (source_url) => {
      expect(
        communitySubmissionSchema.safeParse({ ...valid, source_url }).success,
      ).toBe(false);
    },
  );
  it("requires review notes and all four true checks for readiness", () => {
    const review = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      status: "ready",
      review_notes: "Checked the current original source.",
      review_checks: {
        source_verified: true,
        geography_verified: true,
        facts_verified: true,
        privacy_checked: true,
      },
    };
    expect(submissionReviewSchema.safeParse(review).success).toBe(true);
    for (const key of Object.keys(review.review_checks)) {
      expect(
        submissionReviewSchema.safeParse({
          ...review,
          review_checks: { ...review.review_checks, [key]: false },
        }).success,
      ).toBe(false);
    }
    expect(
      submissionReviewSchema.safeParse({ ...review, review_notes: "" }).success,
    ).toBe(false);
    expect(
      submissionReviewSchema.safeParse({ ...review, status: "published" })
        .success,
    ).toBe(false);
    expect(
      submissionReviewSchema.safeParse({ ...review, review_checks: {} })
        .success,
    ).toBe(false);
    expect(
      submissionReviewSchema.safeParse({ ...review, publish: true }).success,
    ).toBe(false);
  });
});

describe("fail-closed deployment and trusted ingress", () => {
  it("needs explicit activation and all required secrets/configuration", () => {
    expect(submissionConfig().ready).toBe(true);
    for (const key of [
      "COMMUNITY_SUBMISSIONS_ENABLED",
      "NEXT_PUBLIC_APP_URL",
      "SUBMISSION_TRUSTED_IP_HEADER",
      "SUBMISSION_RATE_LIMIT_SALT",
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]) {
      const original = process.env[key];
      vi.stubEnv(key, "");
      expect(submissionConfig().ready, key).toBe(false);
      vi.stubEnv(key, original);
    }
  });
  it("rejects the spoofable X-Forwarded-For configuration", () => {
    vi.stubEnv("SUBMISSION_TRUSTED_IP_HEADER", "x-forwarded-for");
    expect(submissionConfig().ready).toBe(false);
  });
  it.each([
    "",
    "not-url",
    "file:///root",
    "https://user:secret@parispulse.ca",
    "https://parispulse.ca/path",
    "https://parispulse.ca?secret=value",
  ])('fails closed for canonical origin "%s"', (value) => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", value);
    expect(submissionOrigin()).toBe("");
  });
  it("requires HTTPS in production and permits HTTP only in development", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("NODE_ENV", "production");
    expect(submissionConfig().ready).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(submissionConfig().ready).toBe(true);
  });
  it("requires an explicit exact origin and refuses contradictory cross-site metadata", () => {
    const req = (headers: Record<string, string>) =>
      new Request(origin, { headers });
    expect(isSubmissionOrigin(req({ origin }))).toBe(true);
    expect(isSubmissionOrigin(req({}))).toBe(false);
    expect(isSubmissionOrigin(req({ origin: "null" }))).toBe(false);
    expect(isSubmissionOrigin(req({ origin: "https://other.example" }))).toBe(
      false,
    );
    expect(
      isSubmissionOrigin(req({ origin, "sec-fetch-site": "cross-site" })),
    ).toBe(false);
  });
  it("hashes rather than stores a trusted client address and ignores arbitrary XFF", () => {
    const req = new Request(origin, {
      headers: { "x-real-ip": "192.0.2.1", "x-forwarded-for": "203.0.113.7" },
    });
    const fingerprint = submissionClientHash(req);
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(
      submissionClientHash(
        new Request(origin, {
          headers: {
            "x-real-ip": "192.0.2.1",
            "x-forwarded-for": "203.0.113.8",
          },
        }),
      ),
    ).toBe(fingerprint);
    vi.stubEnv("SUBMISSION_RATE_LIMIT_SALT", "different-secret-".repeat(4));
    expect(submissionClientHash(req)).not.toBe(fingerprint);
  });
  it.each([
    "",
    "unknown",
    "192.0.2.1, 192.0.2.2",
    "fe80::1%eth0",
    "[2001:db8::1]",
  ])("refuses absent/ambiguous/zone-qualified proxy identity %s", (value) => {
    expect(
      submissionClientHash(
        new Request(origin, { headers: { "x-real-ip": value } }),
      ),
    ).toBeNull();
  });
  it("uses one budget for equivalent IPv6 forms, rotating /64 hosts and mapped IPv4", () => {
    const fingerprint = (address: string) =>
      submissionClientHash(
        new Request(origin, { headers: { "x-real-ip": address } }),
      );
    expect(fingerprint("2001:db8:1:2::1")).toBe(
      fingerprint("2001:0db8:0001:0002:0000:0000:0000:0001"),
    );
    expect(fingerprint("2001:db8:1:2::1")).toBe(
      fingerprint("2001:db8:1:2:abcd:ffff:ffff:fffe"),
    );
    expect(fingerprint("2001:db8:1:2::1")).not.toBe(
      fingerprint("2001:db8:1:3::1"),
    );
    expect(fingerprint("192.0.2.1")).toBe(fingerprint("::ffff:192.0.2.1"));
  });
});

describe("bounded request parsing", () => {
  const request = (body: BodyInit, headers: Record<string, string> = {}) =>
    new Request(origin, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body,
    });
  it("accepts explicit JSON and UTF-8 content type", async () => {
    expect(
      await readSubmissionJson(
        request(JSON.stringify(valid), {
          "content-type": "application/json; charset=utf-8",
        }),
      ),
    ).toEqual(valid);
  });
  it.each([
    "text/plain",
    "application/jsonp",
    "application/x-www-form-urlencoded",
  ])("rejects non-JSON content type %s", async (type) => {
    await expect(
      readSubmissionJson(request("{}", { "content-type": type })),
    ).rejects.toThrow("content-type");
  });
  it("rejects oversized Content-Length before reading the stream", async () => {
    await expect(
      readSubmissionJson(
        request("{}", { "content-length": `${MAX_SUBMISSION_BODY_BYTES + 1}` }),
      ),
    ).rejects.toThrow("size");
  });
  it("rejects oversized streamed UTF-8 bytes when length is missing or dishonest", async () => {
    await expect(
      readSubmissionJson(
        request(JSON.stringify({ text: "é".repeat(7000) }), {
          "content-length": "2",
        }),
      ),
    ).rejects.toThrow("size");
  });
  it("cancels an oversized stream rather than consuming it fully", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(new Uint8Array(4096));
      },
      cancel,
    });
    const req = new Request(origin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    await expect(readSubmissionJson(req)).rejects.toThrow("size");
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("rejects malformed JSON, missing bodies and invalid UTF-8", async () => {
    await expect(readSubmissionJson(request("{"))).rejects.toThrow();
    await expect(
      readSubmissionJson(
        new Request(origin, {
          method: "POST",
          headers: { "content-type": "application/json" },
        }),
      ),
    ).rejects.toThrow("body");
    await expect(
      readSubmissionJson(request(new Uint8Array([0xff, 0xfe]))),
    ).rejects.toThrow();
  });
});
