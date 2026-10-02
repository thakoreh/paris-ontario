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
import {
  isPersonalizedPushEligible,
  isPushNoticeCurrent,
  type PushLocation,
  type PushPreferences,
  type PushNotice,
} from "@/lib/push-eligibility";

import { isSameOrigin } from "@/lib/push-validation";
export const runtime = "nodejs";
const PAGE_SIZE = 100;
const NOTICE_FIELDS =
  "id, title, summary, slug, community_id, category, severity, latitude, longitude, affected_radius_km, verification_status, is_sample, published_at, expires_at, end_at";
type DeliverableNotice = PushNotice & {
  id: string;
  title: string;
  summary: string | null;
  slug: string;
};
type PrivatePlace = PushLocation & { user_id: string };
const noticeRequest = z.object({ noticeId: z.string().uuid() });

type Subscription = {
  id: string;
  user_id: string;
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

  async function loadLocations(userIds: string[]) {
    const places: PrivatePlace[] = [];
    for (let start = 0; userIds.length; start += 500) {
      const result = await admin!
        .from("locations")
        .select("user_id,community_id,latitude,longitude")
        .in("user_id", userIds)
        .order("id")
        .range(start, start + 499);
      if (result.error) return { data: places, error: result.error };
      const page = (result.data || []) as PrivatePlace[];
      places.push(...page);
      if (page.length < 500) break;
    }
    return { data: places, error: null };
  }

  const noticeResult = await admin
    .from("notices")
    .select(NOTICE_FIELDS)
    .eq("id", noticeId)
    .maybeSingle();
  if (noticeResult.error) return bad("Unable to load notice.", 500);
  const notice = noticeResult.data as DeliverableNotice | null;
  if (!notice || !isPushNoticeCurrent(notice))
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

  const freshCandidates: Array<Subscription & { previousAttempts: number }> =
    [];
  const retryCandidates: Array<Subscription & { previousAttempts: number }> =
    [];
  let activeCount = 0;
  let skipped = 0;
  let sentBefore = 0;
  let offset = 0;
  while (true) {
    const pageResult = await admin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (pageResult.error) return bad("Unable to load push subscriptions.", 500);
    const page = (pageResult.data ?? []) as Subscription[];
    const userIds = [
      ...new Set(page.map((subscription) => subscription.user_id)),
    ];
    // Private coordinates stay inside this server request; no editor response or
    // notification payload contains them. Read preferences afresh on every batch.
    const [locations, preferences] = userIds.length
      ? await Promise.all([
          loadLocations(userIds),
          admin
            .from("alert_preferences")
            .select(
              "user_id,push_enabled,categories_json,radius_km,minimum_severity,quiet_hours_start,quiet_hours_end",
            )
            .in("user_id", userIds)
            .is("location_id", null),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];
    if (locations.error || preferences.error)
      return bad("Unable to verify personalized delivery preferences.", 500);
    const privatePlaces = (locations.data || []) as PrivatePlace[];
    const privatePreferences = (preferences.data || []) as (PushPreferences & {
      user_id: string;
    })[];
    for (const subscription of page) {
      const eligible = isPersonalizedPushEligible(
        notice,
        privatePlaces.filter((place) => place.user_id === subscription.user_id),
        privatePreferences.find(
          (preference) => preference.user_id === subscription.user_id,
        ),
      );
      if (!eligible) {
        skipped += 1;
        continue;
      }
      activeCount += 1;
      const existing = ledger.get(subscription.id);
      if (existing?.status === "sent") sentBefore += 1;
      else if (!existing && freshCandidates.length < 20) {
        freshCandidates.push({ ...subscription, previousAttempts: 0 });
      } else if (existing?.status === "failed") {
        retryCandidates.push({
          ...subscription,
          previousAttempts: existing.attempts,
        });
        retryCandidates.sort((a, b) => a.previousAttempts - b.previousAttempts);
        retryCandidates.splice(20);
      }
    }
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  let sent = 0;
  let failed = 0;
  let deadRemoved = 0;
  let recordingFailures = 0;
  const interrupted = (error: string, status: number) =>
    Response.json(
      {
        error,
        noticeId,
        processed: sent + failed,
        sent,
        failed,
        remaining: Math.max(0, activeCount - sentBefore - sent - deadRemoved),
        recordingFailures,
        skipped,
      },
      { status },
    );
  // New recipients cannot be starved by repeatedly failing earlier endpoints.
  const candidates = [...freshCandidates, ...retryCandidates].slice(0, 20);
  for (const subscription of candidates) {
    // Recheck opt-out/location changes immediately before claiming a send, rather
    // than trusting the earlier page snapshot or the stale SQL match table.
    const [
      currentSubscription,
      currentLocations,
      currentPreferences,
      currentNotice,
    ] = await Promise.all([
      admin
        .from("push_subscriptions")
        .select("id")
        .eq("id", subscription.id)
        .eq("user_id", subscription.user_id)
        .maybeSingle(),
      loadLocations([subscription.user_id]),
      admin
        .from("alert_preferences")
        .select(
          "push_enabled,categories_json,radius_km,minimum_severity,quiet_hours_start,quiet_hours_end",
        )
        .eq("user_id", subscription.user_id)
        .is("location_id", null)
        .maybeSingle(),
      admin
        .from("notices")
        .select(NOTICE_FIELDS)
        .eq("id", noticeId)
        .maybeSingle(),
    ]);
    if (
      currentSubscription.error ||
      currentLocations.error ||
      currentPreferences.error ||
      currentNotice.error
    )
      return interrupted(
        "Unable to recheck personalized delivery preferences.",
        500,
      );
    const freshNotice = currentNotice.data as DeliverableNotice | null;
    if (!freshNotice || !isPushNoticeCurrent(freshNotice))
      return interrupted(
        "Notice is no longer eligible for push delivery.",
        409,
      );
    if (
      !currentSubscription.data ||
      !isPersonalizedPushEligible(
        freshNotice,
        currentLocations.data || [],
        currentPreferences.data,
      )
    ) {
      activeCount -= 1;
      skipped += 1;
      continue;
    }
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
      await sendPush(subscription, buildNoticeNotification(freshNotice));
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
      const recorded = await admin
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
      if (recorded.error) recordingFailures += 1;
      if (statusCode === 404 || statusCode === 410) {
        const removed = await admin
          .from("push_subscriptions")
          .delete()
          .eq("id", subscription.id);
        if (removed.error) recordingFailures += 1;
        else deadRemoved += 1;
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
    skipped,
    deliveryMode: "personalized-editor-selected",
  });
}
