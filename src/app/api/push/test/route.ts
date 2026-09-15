import {
  buildTestNotification,
  createServiceClient,
  getAuthenticatedUser,
  getPushConfig,
  pushStatusCode,
  sendPush,
} from "@/lib/push";

import { isSameOrigin } from "@/lib/push-validation";
export const runtime = "nodejs";
const TEST_WINDOW_MS = 60_000;

const sameOrigin = isSameOrigin;

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Cross-origin request rejected." },
      { status: 403 },
    );
  const session = await getAuthenticatedUser();
  if (!session)
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  if (!getPushConfig().ready)
    return Response.json(
      { error: "Push notifications are not configured." },
      { status: 503 },
    );

  const { data, error } = await session.db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, last_test_at")
    .eq("user_id", session.user.id)
    .limit(100);
  if (error)
    return Response.json(
      { error: "Unable to load push subscriptions." },
      { status: 500 },
    );
  const subscriptions = (data ?? []) as Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    last_test_at: string | null;
  }>;
  if (subscriptions.length === 0) return Response.json({ sent: 0, failed: 0 });

  const service = createServiceClient();
  if (!service)
    return Response.json(
      { error: "Push service is not configured." },
      { status: 503 },
    );
  const cutoff = new Date(Date.now() - TEST_WINDOW_MS).toISOString();
  const claimed: typeof subscriptions = [];
  for (const subscription of subscriptions) {
    if (subscription.last_test_at && subscription.last_test_at >= cutoff)
      continue;
    const claim = await service
      .from("push_subscriptions")
      .update({
        last_test_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)
      .eq("user_id", session.user.id)
      .or(`last_test_at.is.null,last_test_at.lt.${cutoff}`)
      .select("id");
    if (claim.error)
      return Response.json(
        { error: "Unable to claim push test." },
        { status: 500 },
      );
    if ((claim.data ?? []).length > 0) claimed.push(subscription);
  }
  if (claimed.length === 0) {
    return Response.json(
      { error: "Push test is limited to once per minute.", sent: 0 },
      { status: 429 },
    );
  }

  let sent = 0;
  let failed = 0;
  for (const subscription of claimed) {
    try {
      await sendPush(subscription, buildTestNotification());
      sent += 1;
    } catch (pushError) {
      failed += 1;
      if ([404, 410].includes(pushStatusCode(pushError) ?? 0)) {
        await session.db
          .from("push_subscriptions")
          .delete()
          .eq("id", subscription.id)
          .eq("user_id", session.user.id);
      }
    }
  }
  return Response.json({ sent, failed });
}
