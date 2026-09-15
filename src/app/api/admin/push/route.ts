import { z } from "zod";
import { canEdit } from "@/lib/validation";
import {
  buildNoticeNotification,
  getPushConfig,
  createServiceClient,
  getAuthenticatedUser,
  pushStatusCode,
  sendPush,
} from "@/lib/push";
import { readBoundedJson } from "@/lib/push-validation";

import { isSameOrigin } from "@/lib/push-validation";
export const runtime = "nodejs";
const PAGE_SIZE = 100;
const noticeRequest = z.object({ noticeId: z.string().uuid() });

type Subscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};
type Delivery = {
  subscription_id: string;
  status: "pending" | "sent" | "failed";
  attempts: number;
};

const sameOrigin = isSameOrigin;

function bad(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return bad("Cross-origin request rejected.", 403);
  const session = await getAuthenticatedUser();
  if (!session) return bad("Authentication required.", 401);
  const { data: profile } = await session.db
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();
  if (!canEdit(profile?.role))
    return bad("Editor or admin access required.", 403);

  let noticeId: string;
  try {
    noticeId = noticeRequest.parse(await readBoundedJson(request)).noticeId;
  } catch {
    return bad("noticeId must be a UUID.", 400);
  }
  const admin = createServiceClient();
  if (!admin || !getPushConfig().ready)
    return bad("Push service is not configured.", 503);

  const noticeResult = await admin
    .from("notices")
    .select(
      "id, title, summary, slug, verification_status, is_sample, published_at, expires_at",
    )
    .eq("id", noticeId)
    .maybeSingle();
  if (noticeResult.error) return bad("Unable to load notice.", 500);
  const notice = noticeResult.data as {
    id: string;
    title: string;
    summary: string | null;
    slug: string;
    verification_status: string;
    is_sample: boolean;
    published_at: string | null;
    expires_at: string | null;
  } | null;
  if (
    !notice ||
    notice.verification_status !== "verified" ||
    notice.is_sample ||
    !notice.published_at ||
    Date.parse(notice.published_at) > Date.now() ||
    (notice.expires_at !== null &&
      (!Number.isFinite(Date.parse(notice.expires_at)) ||
        Date.parse(notice.expires_at) <= Date.now()))
  )
    return bad("Notice is not eligible for push delivery.", 404);

  const ledger = new Map<string, Delivery>();
  for (let start = 0; ; start += 500) {
    const result = await admin
      .from("push_deliveries")
      .select("subscription_id,status,attempts")
      .eq("notice_id", noticeId)
      .order("subscription_id")
      .range(start, start + 499);
    if (result.error) return bad("Unable to load delivery ledger.", 500);
    for (const row of (result.data || []) as Delivery[])
      ledger.set(row.subscription_id, row);
    if ((result.data || []).length < 500) break;
  }

  const candidates: Array<Subscription & { previousAttempts: number }> = [];
  let activeCount = 0;
  let sentBefore = 0;
  let offset = 0;
  while (true) {
    const pageResult = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (pageResult.error) return bad("Unable to load push subscriptions.", 500);
    const page = (pageResult.data ?? []) as Subscription[];
    activeCount += page.length;
    for (const subscription of page) {
      const existing = ledger.get(subscription.id);
      if (existing?.status === "sent") sentBefore += 1;
      else if (existing?.status !== "pending" && candidates.length < 20) {
        candidates.push({
          ...subscription,
          previousAttempts: existing?.attempts ?? 0,
        });
      }
    }
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  let sent = 0;
  let failed = 0;
  let deadRemoved = 0;
  let recordingFailures = 0;
  for (const subscription of candidates) {
    const attempts = subscription.previousAttempts + 1;
    const claim = {
      status: "pending",
      attempts,
      last_error: null,
      updated_at: new Date().toISOString(),
    };
    // A unique insert or conditional failed->pending transition claims a delivery.
    // Pending rows are deliberately not retried: a crash may have occurred after sending.
    const pending =
      subscription.previousAttempts === 0
        ? await admin
            .from("push_deliveries")
            .insert({
              notice_id: noticeId,
              subscription_id: subscription.id,
              ...claim,
            })
            .select("id")
        : await admin
            .from("push_deliveries")
            .update(claim)
            .eq("notice_id", noticeId)
            .eq("subscription_id", subscription.id)
            .eq("status", "failed")
            .select("id");
    if (pending.error || !pending.data?.length) continue;
    try {
      await sendPush(subscription, buildNoticeNotification(notice));
      sent += 1;
      const recorded = await admin
        .from("push_deliveries")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("notice_id", noticeId)
        .eq("subscription_id", subscription.id);
      if (recorded.error) recordingFailures += 1;
    } catch (pushError) {
      failed += 1;
      const statusCode = pushStatusCode(pushError);
      await admin
        .from("push_deliveries")
        .update({
          status: "failed",
          last_error: statusCode
            ? `Push provider returned ${statusCode}.`
            : "Push provider delivery failed.",
          updated_at: new Date().toISOString(),
        })
        .eq("notice_id", noticeId)
        .eq("subscription_id", subscription.id);
      if (statusCode === 404 || statusCode === 410) {
        await admin
          .from("push_subscriptions")
          .delete()
          .eq("id", subscription.id);
        deadRemoved += 1;
      }
    }
  }

  const remaining = Math.max(0, activeCount - sentBefore - sent - deadRemoved);
  return Response.json({
    ok: true,
    noticeId,
    processed: sent + failed,
    sent,
    failed,
    remaining,
    recordingFailures,
  });
}
