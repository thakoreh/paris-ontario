import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { parsePushSubscription } from "./push-validation";
import { serverClient } from "@/lib/supabase/server";

export type NoticeNotification = { title: string; body: string; url: string };
export type StoredPushSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  last_test_at?: string | null;
};

export function getPushConfig() {
  const publicKey = process.env.PUSH_VAPID_PUBLIC_KEY ?? "";
  const privateKey = process.env.PUSH_VAPID_PRIVATE_KEY ?? "";
  const subject = process.env.PUSH_VAPID_SUBJECT ?? "";
  return { publicKey, ready: Boolean(publicKey && privateKey && subject) };
}

function vapidDetails() {
  const config = getPushConfig();
  if (!config.ready) throw new Error("Push notifications are not configured.");
  return {
    subject: process.env.PUSH_VAPID_SUBJECT!,
    publicKey: config.publicKey,
    privateKey: process.env.PUSH_VAPID_PRIVATE_KEY!,
  };
}

export function buildNoticeNotification(notice: {
  title: string;
  summary?: string | null;
  slug: string;
}): NoticeNotification {
  return {
    title: `Paris Pulse: ${notice.title}`.slice(0, 120),
    body: (notice.summary || notice.title).slice(0, 250),
    url: `/notice/${encodeURIComponent(notice.slug)}`,
  };
}

export function buildTestNotification(): NoticeNotification {
  return {
    title: "Paris Pulse push test",
    body: "Push notifications are connected.",
    url: "/notifications",
  };
}

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getAuthenticatedUser() {
  const db = await serverClient();
  if (!db) return null;
  const {
    data: { user },
  } = await db.auth.getUser();
  return user ? { db, user } : null;
}

export async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  notification: NoticeNotification,
) {
  parsePushSubscription({
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  });
  webpush.setVapidDetails(
    vapidDetails().subject,
    vapidDetails().publicKey,
    vapidDetails().privateKey,
  );
  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(notification),
    { TTL: 3600, timeout: 10000 },
  );
}

export function pushStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = error as { statusCode?: unknown; status?: unknown };
  const status = value.statusCode ?? value.status;
  return typeof status === "number" ? status : undefined;
}
