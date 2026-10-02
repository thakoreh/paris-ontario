import { community } from "@/config/community";
import { submissionReviewSchema } from "@/lib/community-submissions";
import {
  isSubmissionOrigin,
  readSubmissionJson,
  submissionServiceClient,
  submissionSession,
  submissionResponse as reply,
} from "@/lib/submission-server";
import { canEdit } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function editor() {
  try {
    const session = await submissionSession();
    if (!session)
      return {
        error: reply({ error: "Sign in with an editor account." }, 401),
      };
    // Always use the current database role, never client data or JWT metadata.
    const { data, error } = await session.db
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();
    if (error || !canEdit(data?.role))
      return { error: reply({ error: "Editor access required." }, 403) };
    const db = submissionServiceClient();
    return db
      ? { db, user: session.user }
      : { error: reply({ error: "The review service is unavailable." }, 503) };
  } catch {
    return {
      error: reply({ error: "The review service is unavailable." }, 503),
    };
  }
}

export async function GET(request: Request) {
  const session = await editor();
  if (session.error) return session.error;
  const params = new URL(request.url).searchParams;
  const status = params.get("status") || "pending";
  const offsetText = params.get("offset") || "0";
  const offset = Number(offsetText);
  if (
    !["pending", "ready", "rejected"].includes(status) ||
    !/^\d{1,6}$/.test(offsetText) ||
    offset > 100000
  )
    return reply({ error: "Invalid queue filter." }, 400);
  try {
    const { data, error } = await session.db
      .from("community_submissions")
      .select(
        "id,title,body,category,area,source_url,status,created_at,review_notes,review_checks",
      )
      .eq("community_id", community.id)
      .eq("status", status)
      .order("created_at", { ascending: true })
      .order("id")
      .range(offset, offset + 24);
    if (error) throw new Error("queue-unavailable");
    return reply({ submissions: data || [] });
  } catch {
    return reply({ error: "Unable to load the private review queue." }, 503);
  }
}

export async function PATCH(request: Request) {
  if (!isSubmissionOrigin(request))
    return reply({ error: "Cross-origin request rejected." }, 403);
  const session = await editor();
  if (session.error) return session.error;
  let input;
  try {
    input = submissionReviewSchema.parse(await readSubmissionJson(request));
  } catch (error) {
    return reply(
      {
        error:
          "Add review notes and complete every check before marking an update ready.",
      },
      error instanceof Error && error.message === "size" ? 413 : 400,
    );
  }
  try {
    const { data, error } = await session.db
      .from("community_submissions")
      .update({
        status: input.status,
        review_notes: input.review_notes,
        review_checks: input.review_checks,
        moderated_at: new Date().toISOString(),
        moderated_by: session.user.id,
      })
      .eq("id", input.id)
      .eq("community_id", community.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (error) throw new Error("review-unavailable");
    if (!data)
      return reply(
        {
          error:
            "This update was already reviewed or is no longer available. Reload the queue.",
        },
        409,
      );
    return reply({ status: input.status, published: false });
  } catch {
    return reply({ error: "Unable to save the review." }, 503);
  }
}
