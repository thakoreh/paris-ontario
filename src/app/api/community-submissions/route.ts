import { community } from "@/config/community";
import { communitySubmissionSchema } from "@/lib/community-submissions";
import {
  isSubmissionOrigin,
  readSubmissionJson,
  submissionClientHash,
  submissionConfig,
  submissionServiceClient,
  submissionResponse as reply,
} from "@/lib/submission-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!submissionConfig().ready) return reply({ accepting: false });
    const db = submissionServiceClient();
    if (!db) return reply({ accepting: false });
    // This server-only RPC ships with the full intake migration. A table existing
    // alone does not establish that atomic abuse controls were installed.
    const { data, error } = await db.rpc("community_submission_intake_ready", {
      p_community_id: community.id,
    });
    return reply({ accepting: !error && data === true });
  } catch {
    return reply({ accepting: false });
  }
}

export async function POST(request: Request) {
  const config = submissionConfig();
  if (!config.ready)
    return reply({ error: "Community submissions are not open yet." }, 503);
  if (!isSubmissionOrigin(request))
    return reply({ error: "Please submit from Paris Pulse." }, 403);
  const clientHash = submissionClientHash(request, config);
  if (!clientHash)
    return reply(
      { error: "The submission service is temporarily unavailable." },
      503,
    );
  let input;
  try {
    input = communitySubmissionSchema.parse(await readSubmissionJson(request));
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "size";
    return reply(
      {
        error: tooLarge
          ? "Your update is too long."
          : "Check the title, details, Paris area and public source link. Do not include private information.",
      },
      tooLarge ? 413 : 400,
    );
  }
  try {
    const db = submissionServiceClient();
    if (!db)
      return reply(
        { error: "The submission service is temporarily unavailable." },
        503,
      );
    const { data, error } = await db.rpc("submit_community_update", {
      p_community_id: community.id,
      p_client_hash: clientHash,
      p_title: input.title,
      p_body: input.body,
      p_category: input.category,
      p_area: input.area,
      p_source_url: input.source_url,
    });
    if (error || !Array.isArray(data) || data.length !== 1)
      throw new Error("intake-unavailable");
    if (data[0].rate_limited === true)
      return reply(
        {
          error:
            "The submission limit has been reached. Please try again later.",
        },
        429,
        { "Retry-After": "3600" },
      );
    if (
      data[0].rate_limited !== false ||
      typeof data[0].submission_id !== "string"
    )
      throw new Error("intake-unavailable");
    return reply(
      {
        status: "pending",
        message:
          "Received for editorial review. Nothing has been published or sent as an alert.",
      },
      202,
    );
  } catch {
    return reply(
      { error: "We could not save your update. Please try again later." },
      503,
    );
  }
}
