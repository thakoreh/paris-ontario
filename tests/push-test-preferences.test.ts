import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultPreferences } from "@/config/community";
import { POST } from "@/app/api/push/test/route";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  service: vi.fn(),
  send: vi.fn(),
}));
vi.mock("@/lib/push", () => ({
  getAuthenticatedUser: mocks.session,
  createServiceClient: mocks.service,
  sendPush: mocks.send,
  getPushConfig: () => ({ ready: true }),
  buildTestNotification: () => ({
    title: "Test",
    body: "Test",
    url: "/notifications",
  }),
  pushStatusCode: () => undefined,
}));
vi.mock("@/lib/push-validation", () => ({ isSameOrigin: () => true }));

let preferences: typeof defaultPreferences;
let places: { id: string }[];
let subscriptions: {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  last_test_at: null;
}[];
function query(data: unknown) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    limit: () => builder,
    maybeSingle: () => builder,
    update: () => builder,
    or: () => builder,
    then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve(resolve({ data, error: null })),
  };
  return builder;
}
const request = () =>
  new Request("https://parispulse.ca/api/push/test", { method: "POST" });
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-02T16:00:00Z"));
  preferences = { ...defaultPreferences, push_enabled: true };
  places = [{ id: "place" }];
  subscriptions = [
    {
      id: "subscription",
      endpoint: "endpoint",
      p256dh: "key",
      auth: "key",
      last_test_at: null,
    },
  ];
  mocks.send.mockReset().mockResolvedValue(undefined);
  const db = {
    from: (table: string) =>
      query(
        table === "alert_preferences"
          ? preferences
          : table === "locations"
            ? places
            : subscriptions,
      ),
  };
  mocks.session.mockResolvedValue({ user: { id: "user" }, db });
  mocks.service.mockReturnValue(db);
});
afterEach(() => vi.useRealTimers());

describe("explicit push test respects delivery opt-out", () => {
  it("rejects a disabled master preference without contacting a push provider", async () => {
    preferences.push_enabled = false;
    expect((await POST(request())).status).toBe(409);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("rejects missing place or category selection", async () => {
    places = [];
    expect((await POST(request())).status).toBe(409);
    places = [{ id: "place" }];
    preferences.categories_json = [];
    expect((await POST(request())).status).toBe(409);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("rejects active or incomplete Toronto quiet hours", async () => {
    preferences.quiet_hours_start = "11:00";
    preferences.quiet_hours_end = "13:00";
    expect((await POST(request())).status).toBe(409);
    preferences.quiet_hours_end = null;
    expect((await POST(request())).status).toBe(409);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("allows an explicit connection test only when saved setup and master permit it", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: 1, failed: 0 });
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it("stops later device tests after an account opt-out and preserves accepted counts", async () => {
    subscriptions.push({ ...subscriptions[0], id: "second-device" });
    mocks.send.mockImplementationOnce(async () => {
      preferences.push_enabled = false;
    });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ sent: 1, failed: 0 });
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
});
