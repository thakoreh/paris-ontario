import {
  createServiceClient,
  getAuthenticatedUser,
  getPushConfig,
} from "@/lib/push";
import {
  isSameOrigin,
  parsePushSubscription,
  parseUnsubscribeRequest,
  readBoundedJson,
} from "@/lib/push-validation";
export const runtime = "nodejs";
export async function GET() {
  return Response.json(getPushConfig(), {
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST(request: Request) {
  if (!isSameOrigin(request))
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
  const admin = createServiceClient();
  if (!admin || !getPushConfig().ready)
    return Response.json(
      { error: "Push service is not configured." },
      { status: 503 },
    );
  try {
    const sub = parsePushSubscription(await readBoundedJson(request));
    const { data: existing, error: lookupError } = await admin
      .from("push_subscriptions")
      .select("id,user_id")
      .eq("endpoint", sub.endpoint)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing && existing.user_id !== session.user.id)
      return Response.json(
        {
          error:
            "This browser is linked to a different account. Revoke notification permission, then enable again.",
        },
        { status: 409 },
      );
    const { count, error: countError } = await admin
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id);
    if (countError) throw countError;
    if (!existing && (count || 0) >= 10)
      return Response.json(
        {
          error: "Device limit reached. Remove an existing subscription first.",
        },
        { status: 429 },
      );
    const { error } = await admin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: session.user.id,
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? Number(error.status)
        : 500;
    return Response.json(
      {
        error:
          status === 400 && error instanceof Error
            ? error.message
            : "Unable to save push subscription.",
      },
      { status: [400, 413].includes(status) ? status : 500 },
    );
  }
}
export async function DELETE(request: Request) {
  if (!isSameOrigin(request))
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
  try {
    const { endpoint } = parseUnsubscribeRequest(
      await readBoundedJson(request),
    );
    const { error } = await session.db
      .from("push_subscriptions")
      .delete()
      .eq("user_id", session.user.id)
      .eq("endpoint", endpoint);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Unable to remove subscription." },
      { status: 400 },
    );
  }
}
