import { describe, expect, it } from "vitest";
import {
  MAX_PUSH_BODY_BYTES,
  parsePushSubscription,
  parseUnsubscribeRequest,
  readBoundedJson,
  isSameOrigin,
} from "@/lib/push-validation";
import { buildNoticeNotification, getPushConfig } from "@/lib/push";

describe("push subscription validation", () => {
  it("uses configured public origin behind a reverse proxy and rejects foreign sites", () => {
    expect(
      isSameOrigin(
        new Request("http://localhost:3000/api/push", {
          headers: { origin: "https://parispulse.ca" },
        }),
        "https://parispulse.ca",
      ),
    ).toBe(true);
    expect(
      isSameOrigin(
        new Request("http://localhost:3000/api/push", {
          headers: { origin: "https://evil.example" },
        }),
        "https://parispulse.ca",
      ),
    ).toBe(false);
  });
  const valid = {
    endpoint: "https://fcm.googleapis.com/fcm/send/test-token",
    keys: {
      p256dh: "B".repeat(87),
      auth: "A".repeat(22),
    },
  };

  it("accepts a provider endpoint and preserves its keys", () => {
    expect(parsePushSubscription(valid)).toEqual(valid);
  });

  it.each([
    "http://fcm.googleapis.com/fcm/send/x",
    "https://example.com/push/x",
    "https://fcm.googleapis.com:443/fcm/send/x",
    "https://user:fcm.googleapis.com@fcm.googleapis.com/fcm/send/x",
    "https://fcm.googleapis.com/fcm/send/x?redirect=https://example.com",
    "https://evil.push.services.mozilla.com.evil.test/push/x",
  ])("rejects unsafe endpoint %s", (endpoint) => {
    expect(() => parsePushSubscription({ ...valid, endpoint })).toThrow();
  });

  it("accepts the other supported browser push providers", () => {
    for (const endpoint of [
      "https://updates.push.services.mozilla.com/wpush/v2/x",
      "https://web.push.apple.com/Qx/x",
      "https://updates.notify.windows.com/w/token-x",
    ]) {
      expect(parsePushSubscription({ ...valid, endpoint }).endpoint).toBe(
        endpoint,
      );
    }
  });

  it.each([
    { p256dh: "A", auth: valid.keys.auth },
    { p256dh: "B".repeat(86), auth: valid.keys.auth },
    { p256dh: "B".repeat(87), auth: "A".repeat(21) },
    { p256dh: "B".repeat(87) + "=", auth: valid.keys.auth },
  ])("rejects malformed key material", (keys) => {
    expect(() => parsePushSubscription({ ...valid, keys })).toThrow();
  });

  it("bounds JSON bodies before parsing", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: "x".repeat(MAX_PUSH_BODY_BYTES + 1),
      headers: { "content-type": "application/json" },
    });
    await expect(readBoundedJson(request)).rejects.toMatchObject({
      status: 413,
    });
  });

  it("validates unsubscribe requests with the same endpoint policy", () => {
    expect(parseUnsubscribeRequest({ endpoint: valid.endpoint })).toEqual({
      endpoint: valid.endpoint,
    });
    expect(() =>
      parseUnsubscribeRequest({ endpoint: "https://example.com" }),
    ).toThrow();
  });
});

describe("push notification construction", () => {
  it("contains only safe notification fields and an encoded relative notice URL", () => {
    const notification = buildNoticeNotification({
      title: "Road closure",
      summary: "Use King Street instead.",
      slug: "road closure/one",
    });
    expect(notification).toEqual({
      title: "Paris Pulse: Road closure",
      body: "Use King Street instead.",
      url: "/notice/road%20closure%2Fone",
    });
    expect(Object.keys(notification)).toEqual(["title", "body", "url"]);
  });

  it("reports VAPID readiness without exposing the private key", () => {
    const old = {
      publicKey: process.env.PUSH_VAPID_PUBLIC_KEY,
      privateKey: process.env.PUSH_VAPID_PRIVATE_KEY,
      subject: process.env.PUSH_VAPID_SUBJECT,
    };
    process.env.PUSH_VAPID_PUBLIC_KEY = "public";
    process.env.PUSH_VAPID_PRIVATE_KEY = "private";
    process.env.PUSH_VAPID_SUBJECT = "mailto:alerts@example.test";
    expect(getPushConfig()).toEqual({ publicKey: "public", ready: true });
    if (old.publicKey === undefined) delete process.env.PUSH_VAPID_PUBLIC_KEY;
    else process.env.PUSH_VAPID_PUBLIC_KEY = old.publicKey;
    if (old.privateKey === undefined) delete process.env.PUSH_VAPID_PRIVATE_KEY;
    else process.env.PUSH_VAPID_PRIVATE_KEY = old.privateKey;
    if (old.subject === undefined) delete process.env.PUSH_VAPID_SUBJECT;
    else process.env.PUSH_VAPID_SUBJECT = old.subject;
  });
});
