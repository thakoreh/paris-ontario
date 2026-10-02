import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/community-submissions/route";
import {
  GET as queue,
  PATCH as review,
} from "@/app/api/admin/submissions/route";
import { community } from "@/config/community";

const mocks = vi.hoisted(() => ({ service: vi.fn(), session: vi.fn() }));
vi.mock("@/lib/submission-server", async (original) => ({
  ...(await original<typeof import("@/lib/submission-server")>()),
  submissionServiceClient: mocks.service,
  submissionSession: mocks.session,
}));
const origin = "https://parispulse.ca";
const submissionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const editorId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const valid = {
  title: "Bridge repairs next week",
  body: "The municipal notice describes upcoming bridge repairs.",
  category: "roads",
  area: "downtown",
  source_url: "https://www.brant.ca/closures",
  public_details_only: true,
  website: "",
};
const validReview = {
  id: submissionId,
  status: "ready",
  review_notes: "Checked the current original municipal source.",
  review_checks: {
    source_verified: true,
    geography_verified: true,
    facts_verified: true,
    privacy_checked: true,
  },
};
let rpc: ReturnType<typeof vi.fn>;
let from: ReturnType<typeof vi.fn>;
let query: Record<string, ReturnType<typeof vi.fn>>;
let roleResult: ReturnType<typeof vi.fn>;
function request(
  body: unknown = valid,
  headers: Record<string, string> = {},
  path = "/api/community-submissions",
  method = "POST",
) {
  return new Request(`${origin}${path}`, {
    method,
    headers: {
      origin,
      "content-type": "application/json",
      "x-real-ip": "192.0.2.1",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
function reviewRequest(
  body: unknown = validReview,
  headers: Record<string, string> = {},
) {
  return request(body, headers, "/api/admin/submissions", "PATCH");
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", origin);
  vi.stubEnv("COMMUNITY_SUBMISSIONS_ENABLED", "true");
  vi.stubEnv("SUBMISSION_TRUSTED_IP_HEADER", "x-real-ip");
  vi.stubEnv("SUBMISSION_RATE_LIMIT_SALT", "test-secret-".repeat(4));
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://database.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
  rpc = vi.fn().mockResolvedValue({
    data: [{ submission_id: submissionId, rate_limited: false }],
    error: null,
  });
  query = Object.fromEntries(
    ["select", "eq", "order", "range", "update", "maybeSingle"].map((name) => [
      name,
      vi.fn(),
    ]),
  );
  for (const value of Object.values(query))
    value.mockImplementation(() => query);
  query.range.mockResolvedValue({ data: [], error: null });
  query.maybeSingle.mockResolvedValue({
    data: { id: submissionId },
    error: null,
  });
  from = vi.fn().mockReturnValue(query);
  mocks.service.mockReturnValue({ rpc, from });
  roleResult = vi
    .fn()
    .mockResolvedValue({ data: { role: "editor" }, error: null });
  const profileQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: roleResult,
  };
  profileQuery.select.mockReturnValue(profileQuery);
  profileQuery.eq.mockReturnValue(profileQuery);
  mocks.session.mockResolvedValue({
    user: { id: editorId, user_metadata: { role: "admin" } },
    db: { from: vi.fn().mockReturnValue(profileQuery) },
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("anonymous intake route", () => {
  it("only accepts after readiness RPC confirms the complete migration", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    const response = await GET();
    expect(await response.json()).toEqual({ accepting: true });
    expect(rpc).toHaveBeenCalledWith("community_submission_intake_ready", {
      p_community_id: community.id,
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(from).not.toHaveBeenCalled();
  });
  it.each([
    { data: false, error: null },
    { data: null, error: null },
    { data: true, error: { message: "missing function" } },
  ])(
    "fails readiness closed for missing migration, inactive community, or bad dependency: %j",
    async (result) => {
      rpc.mockResolvedValue(result);
      expect(await (await GET()).json()).toEqual({ accepting: false });
    },
  );
  it("fails readiness closed when client creation or the provider throws", async () => {
    mocks.service.mockImplementationOnce(() => {
      throw new Error("configuration secret");
    });
    expect(await (await GET()).json()).toEqual({ accepting: false });
    rpc.mockRejectedValue(new Error("private backend detail"));
    expect(await (await GET()).json()).toEqual({ accepting: false });
  });
  it("does not access the database or accept submissions without activation", async () => {
    vi.stubEnv("COMMUNITY_SUBMISSIONS_ENABLED", "false");
    expect(await (await GET()).json()).toEqual({ accepting: false });
    expect((await POST(request())).status).toBe(503);
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it("saves one anonymous evidence record through the atomic RPC and returns no identifiers", async () => {
    const response = await POST(request());
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      status: "pending",
      message:
        "Received for editorial review. Nothing has been published or sent as an alert.",
    });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("submit_community_update", {
      p_community_id: community.id,
      p_client_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      p_title: valid.title,
      p_body: valid.body,
      p_category: valid.category,
      p_area: valid.area,
      p_source_url: valid.source_url,
    });
    expect(from).not.toHaveBeenCalled();
    expect(mocks.session).not.toHaveBeenCalled();
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("192.0.2.1");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it.each([
    "",
    "null",
    "https://attacker.example",
    "https://parispulse.ca.attacker.example",
  ])("rejects Origin %s before database work", async (value) => {
    expect((await POST(request(valid, { origin: value }))).status).toBe(403);
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it("rejects contradictory cross-site fetch metadata", async () => {
    expect(
      (await POST(request(valid, { "sec-fetch-site": "cross-site" }))).status,
    ).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each(["", "192.0.2.1, 198.51.100.1", "unknown", "fe80::1%eth0"])(
    "fails closed for absent/unsafe trusted IP %s",
    async (ip) => {
      expect((await POST(request(valid, { "x-real-ip": ip }))).status).toBe(
        503,
      );
      expect(rpc).not.toHaveBeenCalled();
    },
  );
  it.each([
    { status: "ready" },
    { website: "bot" },
    { public_details_only: false },
    { area: "elsewhere" },
    { contact_email: "private@example.com" },
    { source_url: "https://www.brant.ca/notice?token=private" },
  ])(
    "rejects invalid or privileged data before database work: %j",
    async (change) => {
      expect((await POST(request({ ...valid, ...change }))).status).toBe(400);
      expect(mocks.service).not.toHaveBeenCalled();
    },
  );
  it("rejects oversized requests with 413 before touching persistence", async () => {
    expect(
      (await POST(request({ ...valid, body: "x".repeat(13 * 1024) }))).status,
    ).toBe(413);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("surfaces persistent rate limits with a retry hint and never fabricates success", async () => {
    rpc.mockResolvedValue({
      data: [{ submission_id: null, rate_limited: true }],
      error: null,
    });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("3600");
    expect(await response.json()).not.toHaveProperty("status", "pending");
  });
  it.each([
    { data: null, error: null },
    { data: [], error: null },
    { data: [{}], error: null },
    {
      data: [{ submission_id: submissionId, rate_limited: false }],
      error: { message: "private db host" },
    },
    { data: [{ submission_id: null, rate_limited: false }], error: null },
  ])(
    "rejects unexpected RPC results without disclosing backend details: %j",
    async (result) => {
      rpc.mockResolvedValue(result);
      const response = await POST(request());
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        error: "We could not save your update. Please try again later.",
      });
    },
  );
  it("handles dependency throws and missing service credentials without success", async () => {
    rpc.mockRejectedValue(new Error("private database host"));
    expect((await POST(request())).status).toBe(503);
    mocks.service.mockReturnValue(null);
    expect((await POST(request())).status).toBe(503);
  });
});

describe("private editor queue route", () => {
  it("requires a verified session before exposing any queue rows", async () => {
    mocks.session.mockResolvedValue(null);
    expect(
      (await queue(new Request(`${origin}/api/admin/submissions`))).status,
    ).toBe(401);
    expect((await review(reviewRequest())).status).toBe(401);
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it.each(["user", null, "owner", "Editor"])(
    "rejects current database role %s regardless of claimed metadata",
    async (role) => {
      roleResult.mockResolvedValue({ data: { role }, error: null });
      expect(
        (await queue(new Request(`${origin}/api/admin/submissions`))).status,
      ).toBe(403);
      expect((await review(reviewRequest())).status).toBe(403);
      expect(mocks.service).not.toHaveBeenCalled();
    },
  );
  it("fails closed when role lookup errors or authentication throws", async () => {
    roleResult.mockResolvedValue({
      data: { role: "editor" },
      error: { message: "role error" },
    });
    expect(
      (await queue(new Request(`${origin}/api/admin/submissions`))).status,
    ).toBe(403);
    mocks.session.mockRejectedValue(new Error("private auth detail"));
    const response = await queue(
      new Request(`${origin}/api/admin/submissions`),
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private auth");
  });
  it("reads a bounded, stable, community-scoped queue with no private network/user identifiers", async () => {
    const response = await queue(
      new Request(`${origin}/api/admin/submissions`),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ submissions: [] });
    expect(from).toHaveBeenCalledExactlyOnceWith("community_submissions");
    expect(query.eq).toHaveBeenCalledWith("community_id", community.id);
    expect(query.eq).toHaveBeenCalledWith("status", "pending");
    expect(query.range).toHaveBeenCalledWith(0, 24);
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(query.order).toHaveBeenCalledWith("id");
    expect(query.select).toHaveBeenCalledWith(
      "id,title,body,category,area,source_url,status,created_at,review_notes,review_checks",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("accepts explicit status and page offsets", async () => {
    await queue(
      new Request(`${origin}/api/admin/submissions?status=ready&offset=25`),
    );
    expect(query.eq).toHaveBeenCalledWith("status", "ready");
    expect(query.range).toHaveBeenCalledWith(25, 49);
  });
  it.each([
    "status=published",
    "offset=-1",
    "offset=1.5",
    "offset=1e3",
    "offset=100001",
    "offset=NaN",
  ])("rejects unsafe/unbounded queue filters: %s", async (filter) => {
    expect(
      (await queue(new Request(`${origin}/api/admin/submissions?${filter}`)))
        .status,
    ).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });
  it("requires same-origin for every authenticated mutation, including missing Origin", async () => {
    for (const value of ["", "null", "https://attacker.example"])
      expect(
        (await review(reviewRequest(validReview, { origin: value }))).status,
      ).toBe(403);
    expect(mocks.session).not.toHaveBeenCalled();
  });
  it("only updates the pending row in this community, attributes the editor and does not publish", async () => {
    const response = await review(reviewRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ready",
      published: false,
    });
    expect(from).toHaveBeenCalledExactlyOnceWith("community_submissions");
    expect(query.update).toHaveBeenCalledWith({
      status: "ready",
      review_notes: validReview.review_notes,
      review_checks: validReview.review_checks,
      moderated_at: expect.any(String),
      moderated_by: editorId,
    });
    expect(query.eq).toHaveBeenCalledWith("id", submissionId);
    expect(query.eq).toHaveBeenCalledWith("community_id", community.id);
    expect(query.eq).toHaveBeenCalledWith("status", "pending");
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([
    { status: "published" },
    { status: "pending" },
    { review_notes: "" },
    { title: "Edited evidence" },
    { moderated_by: editorId },
    { review_checks: { ...validReview.review_checks, privacy_checked: false } },
  ])("does not mutate for an invalid editorial payload: %j", async (change) => {
    expect(
      (await review(reviewRequest({ ...validReview, ...change }))).status,
    ).toBe(400);
    expect(query.update).not.toHaveBeenCalled();
  });
  it("reports a concurrent/previous review as a conflict", async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await review(reviewRequest())).status).toBe(409);
  });
  it("keeps queue/review errors generic, private and fail-closed", async () => {
    query.range.mockRejectedValue(new Error("private database exception"));
    expect(
      (await queue(new Request(`${origin}/api/admin/submissions`))).status,
    ).toBe(503);
    query.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "private database exception" },
    });
    const response = await review(reviewRequest());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private database exception");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
