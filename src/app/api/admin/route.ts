import { serverClient } from "@/lib/supabase/server";
import { canEdit, noticeSchema, sourceUrl } from "@/lib/validation";
import { community } from "@/config/community";
import { z } from "zod";
async function auth() {
  const db = await serverClient();
  if (!db) return null;
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  return canEdit(data?.role) ? db : null;
}
export async function GET() {
  const db = await auth();
  if (!db)
    return Response.json(
      { error: "Editor or admin access required." },
      { status: 403 },
    );
  const result = await Promise.all(
    ["notices", "deadlines", "official_sources", "ingestion_runs", "users"].map(
      async (table) => {
        const { data, error } = await db.from(table).select("*").limit(200);
        if (error) throw error;
        return [table, data];
      },
    ),
  ).catch(() => null);
  return result
    ? Response.json(Object.fromEntries(result))
    : Response.json({ error: "Unable to load admin data." }, { status: 500 });
}
export async function POST(request: Request) {
  const db = await auth();
  if (!db)
    return Response.json(
      { error: "Editor or admin access required." },
      { status: 403 },
    );
  try {
    const body = await request.json();
    if (body.action === "merge") {
      const keep = z.string().uuid().parse(body.keep_id);
      const duplicate = z.string().uuid().parse(body.duplicate_id);
      const { error } = await db.rpc("merge_notices", {
        keep_id: keep,
        duplicate_id: duplicate,
      });
      if (error) throw error;
      return Response.json({ ok: true });
    }
    if (body.action === "preview") {
      const id = z.string().uuid().parse(body.id);
      const { data, error } = await db.rpc("notice_match_count", {
        target_notice: id,
      });
      if (error) throw error;
      return Response.json({ count: data });
    }
    const table = z
      .enum(["notices", "deadlines", "official_sources"])
      .parse(body.table);
    const id = body.id ? z.string().uuid().parse(body.id) : undefined;
    const now = new Date().toISOString();
    let verifiedSourceId: string | null = null;
    let row: Record<string, unknown>;
    if (table === "notices") {
      const input = noticeSchema.parse(body.data);
      if (input.verification_status === "verified" && !input.is_sample)
        verifiedSourceId = input.source_id;
      row = {
        ...input,
        community_id: community.id,
        city: community.name,
        slug:
          input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
          "-" +
          (id || crypto.randomUUID()).slice(0, 8),
        verified_at:
          input.verification_status === "verified" && !input.is_sample
            ? now
            : null,
        updated_at: now,
        ...(!id ? { published_at: now, retrieved_at: now } : {}),
        ...(id ? { id } : {}),
      };
    } else if (table === "deadlines") {
      row = {
        ...z
          .object({
            title: z.string().min(5),
            description: z.string().min(10),
            category: z.string(),
            deadline_at: z.string().datetime(),
            official_url: sourceUrl,
            source_id: z.string().uuid(),
            is_sample: z.boolean(),
            verified_at: z.string().datetime().nullable(),
            latitude: z.number().nullable(),
            longitude: z.number().nullable(),
          })
          .parse(body.data),
        community_id: community.id,
        ...(id ? { id } : {}),
      };
    } else {
      row = {
        ...z
          .object({
            name: z.string().min(2),
            organization: z.string().min(2),
            url: sourceUrl,
            authority_level: z.enum([
              "official",
              "official_agency",
              "trusted_local_org",
              "trusted_media",
              "community_signal",
            ]),
            description: z.string(),
            active: z.boolean(),
          })
          .parse(body.data),
        source_type: "website",
        ingestion_type: "manual",
        ingestion_enabled: false,
        community_id: community.id,
        ...(id ? { id } : {}),
      };
    }
    const { data, error } = await db.from(table).upsert(row).select().single();
    if (error) throw error;
    if (verifiedSourceId) {
      const { error: sourceError } = await db
        .from("official_sources")
        .update({ last_checked_at: now, last_success_at: now })
        .eq("id", verifiedSourceId);
      if (sourceError) throw sourceError;
    }
    return Response.json({ data });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Invalid request." },
      { status: 400 },
    );
  }
}
