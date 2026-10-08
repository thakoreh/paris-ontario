import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultPreferences } from "@/config/community";
import { POST } from "@/app/api/admin/push/route";

const mocks = vi.hoisted(() => ({
  service: vi.fn(),
  session: vi.fn(),
  send: vi.fn(),
}));
vi.mock("@/lib/push", () => ({
  createServiceClient: mocks.service,
  getAuthenticatedUser: mocks.session,
  getPushConfig: () => ({ ready: true, publicKey: "public" }),
  sendPush: mocks.send,
  pushStatusCode: (error: { statusCode?: number }) => error.statusCode,
  buildNoticeNotification: (notice: { title: string; slug: string }) => ({
    title: notice.title,
    url: `/notice/${notice.slug}`,
  }),
}));
vi.mock("@/lib/push-validation", () => ({
  isSameOrigin: () => true,
  readBoundedJson: (request: Request) => request.json(),
}));

type Row = Record<string, unknown>;
const noticeId = "11111111-1111-4111-8111-111111111111";
let tables: Record<string, Row[]>;
let beforeQuery: (table: string, operation: string) => void;
let queryError: (table: string, operation: string) => boolean;
class Query {
  filters: ((row: Row) => boolean)[] = [];
  operation = "read";
  payload: Row = {};
  single = false;
  rangeStart = 0;
  rangeEnd = 499; // Simulate a backend row cap unless an explicit page is requested.
  constructor(readonly table: string) {}
  select() {
    return this;
  }
  eq(key: string, value: unknown) {
    this.filters.push((row) => row[key] === value);
    return this;
  }
  is(key: string, value: unknown) {
    return this.eq(key, value);
  }
  in(key: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[key]));
    return this;
  }
  order() {
    return this;
  }
  range(start: number, end: number) {
    this.rangeStart = start;
    this.rangeEnd = end;
    return this;
  }
  maybeSingle() {
    this.single = true;
    return this;
  }
  insert(payload: Row) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }
  update(payload: Row) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }
  delete() {
    this.operation = "delete";
    return this;
  }
  then(
    resolve: (value: {
      data: Row[] | Row | null;
      error: null | { message: string };
    }) => unknown,
  ) {
    beforeQuery(this.table, this.operation);
    if (queryError(this.table, this.operation))
      return Promise.resolve(
        resolve({ data: null, error: { message: "Storage unavailable" } }),
      );
    const rows = tables[this.table] || [];
    let result = rows
      .filter((row) => this.filters.every((filter) => filter(row)))
      .slice(this.rangeStart, this.rangeEnd + 1);
    if (this.operation === "insert") {
      if (
        rows.some(
          (row) =>
            row.notice_id === this.payload.notice_id &&
            row.subscription_id === this.payload.subscription_id,
        )
      )
        return Promise.resolve(
          resolve({ data: null, error: { message: "duplicate" } }),
        );
      rows.push({ id: `ledger-${rows.length}`, ...this.payload });
      result = [rows[rows.length - 1]];
    }
    if (this.operation === "update")
      result.forEach((row) => Object.assign(row, this.payload));
    if (this.operation === "delete")
      tables[this.table] = rows.filter((row) => !result.includes(row));
    return Promise.resolve(
      resolve({ data: this.single ? result[0] || null : result, error: null }),
    );
  }
}
function subscribe(index: number, overrides: Row = {}) {
  const userId = `user-${index}`;
  tables.push_subscriptions.push({
    id: `sub-${index}`,
    user_id: userId,
    endpoint: `endpoint-${index}`,
    p256dh: "key",
    auth: "key",
  });
  tables.locations.push({
    id: `place-${index}`,
    user_id: userId,
    community_id: "paris",
    latitude: 43.1945,
    longitude: -80.3844,
  });
  tables.alert_preferences.push({
    ...defaultPreferences,
    user_id: userId,
    location_id: null,
    push_enabled: true,
    ...overrides,
  });
}
async function dispatch() {
  return POST(
    new Request("https://parispulse.ca/api/admin/push", {
      method: "POST",
      body: JSON.stringify({ noticeId }),
    }),
  );
}
beforeEach(() => {
  vi.useRealTimers();
  mocks.send.mockReset().mockResolvedValue(undefined);
  tables = {
    users: [{ id: "editor", role: "editor" }],
    notices: [
      {
        id: noticeId,
        title: "A road update",
        slug: "road-update",
        community_id: "paris",
        category: "roads",
        severity: "useful",
        latitude: 43.1945,
        longitude: -80.3844,
        affected_radius_km: 0,
        verification_status: "verified",
        is_sample: false,
        published_at: "2020-01-01T00:00:00Z",
        expires_at: null,
        end_at: null,
      },
    ],
    push_subscriptions: [],
    locations: [],
    alert_preferences: [],
    push_deliveries: [],
  };
  const db = { from: (table: string) => new Query(table) };
  mocks.service.mockReturnValue(db);
  mocks.session.mockResolvedValue({ db, user: { id: "editor" } });
  beforeQuery = () => {};
  queryError = () => false;
});

describe("personalized dispatch and delivery ledger", () => {
  it("sends only matching opted-in subscriptions, with no private data in output", async () => {
    subscribe(1);
    subscribe(2, { push_enabled: false });
    subscribe(3, { categories_json: ["event"] });
    subscribe(4);
    subscribe(5);
    tables.locations[3].latitude = 44;
    tables.locations.pop();
    const response = await dispatch();
    expect(response.status).toBe(200);
    const output = await response.json();
    expect(output).toMatchObject({ sent: 1, skipped: 4, remaining: 0 });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(output)).not.toMatch(
      /latitude|longitude|user-|place-/,
    );
    expect(mocks.send.mock.calls[0][1]).not.toHaveProperty("latitude");
  });
  it("deduplicates repeated and concurrent sends and multiple matching places", async () => {
    subscribe(1);
    tables.locations.push({ ...tables.locations[0], id: "other-place" });
    await Promise.all([dispatch(), dispatch()]);
    await dispatch();
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(tables.push_deliveries).toHaveLength(1);
    expect(tables.push_deliveries[0].status).toBe("sent");
  });
  it("never retries an ambiguous pending claim", async () => {
    subscribe(1);
    tables.push_deliveries.push({
      notice_id: noticeId,
      subscription_id: "sub-1",
      status: "pending",
      attempts: 1,
    });
    await dispatch();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("rechecks a master opt-out before claiming delivery", async () => {
    subscribe(1);
    let reads = 0;
    beforeQuery = (table) => {
      if (table === "alert_preferences" && ++reads === 2)
        tables.alert_preferences[0].push_enabled = false;
    };
    expect((await (await dispatch()).json()).sent).toBe(0);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(tables.push_deliveries).toHaveLength(0);
  });
  it("rechecks device opt-out and unpublished notices before sending", async () => {
    subscribe(1);
    let reads = 0;
    beforeQuery = (table) => {
      if (table === "push_subscriptions" && ++reads === 2)
        tables.push_subscriptions = [];
    };
    await dispatch();
    expect(mocks.send).not.toHaveBeenCalled();
    subscribe(2);
    reads = 0;
    beforeQuery = (table) => {
      if (table === "notices" && ++reads === 2)
        tables.notices[0].verification_status = "rejected";
    };
    expect((await dispatch()).status).toBe(409);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("scans later subscription pages and location pages without broadening matching", async () => {
    for (let i = 0; i < 101; i++) subscribe(i, { push_enabled: i === 100 });
    tables.locations = Array.from({ length: 600 }, (_, i) => ({
      ...tables.locations[100],
      id: `far-${i}`,
      latitude: 44,
    }));
    tables.locations.push({
      id: "near-last",
      user_id: "user-100",
      community_id: "paris",
      latitude: 43.1945,
      longitude: -80.3844,
    });
    expect((await (await dispatch()).json()).sent).toBe(1);
  });
  it("prioritizes new recipients over failures and keeps the batch capped at 20", async () => {
    for (let i = 0; i < 25; i++) {
      subscribe(i);
      if (i < 20)
        tables.push_deliveries.push({
          notice_id: noticeId,
          subscription_id: `sub-${i}`,
          status: "failed",
          attempts: 3,
        });
    }
    await dispatch();
    expect(mocks.send).toHaveBeenCalledTimes(20);
    expect(mocks.send.mock.calls.slice(0, 5).map((call) => call[0].id)).toEqual(
      ["sub-20", "sub-21", "sub-22", "sub-23", "sub-24"],
    );
  });
  it("reports accepted deliveries when a later recheck withdraws the notice", async () => {
    subscribe(1);
    subscribe(2);
    mocks.send.mockImplementationOnce(async () => {
      tables.notices[0].verification_status = "rejected";
    });
    const response = await dispatch();
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      sent: 1,
      failed: 0,
      remaining: 1,
    });
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it("reports failed ledger writes and failed expired-endpoint cleanup accurately", async () => {
    subscribe(1);
    mocks.send.mockRejectedValue({ statusCode: 410 });
    queryError = (table, operation) =>
      (table === "push_deliveries" && operation === "update") ||
      (table === "push_subscriptions" && operation === "delete");
    expect(await (await dispatch()).json()).toMatchObject({
      sent: 0,
      failed: 1,
      remaining: 1,
      recordingFailures: 2,
    });
    expect(tables.push_subscriptions).toHaveLength(1);
  });
});
