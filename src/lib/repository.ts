import { serverClient } from "./supabase/server";
import type { Notice, Deadline, Source } from "@/types";
import { verifiedPreview } from "@/data/verified-preview";
import { isPublicDeadline, isPublicNotice } from "./public-content";

const previewMode = () =>
  process.env.PARIS_PULSE_TEST_MODE === "1" &&
  process.env.NODE_ENV !== "production";

const unavailable = {
  notices: [] as Notice[],
  deadlines: [] as Deadline[],
  sources: [] as Source[],
  demo: false,
  error: "Local updates are temporarily unavailable.",
};

export async function publicData(nowDate = new Date()) {
  if (previewMode()) {
    return {
      ...verifiedPreview,
      notices: verifiedPreview.notices.filter((notice) =>
        isPublicNotice(notice, nowDate),
      ),
      deadlines: verifiedPreview.deadlines.filter((deadline) =>
        isPublicDeadline(deadline, nowDate),
      ),
    };
  }
  const db = await serverClient();
  if (!db) return unavailable;
  const now = nowDate.toISOString();
  const [n, d, s] = await Promise.all([
    db
      .from("notices")
      .select("*")
      .eq("verification_status", "verified")
      .eq("is_sample", false)
      .lte("published_at", now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .or(`end_at.is.null,end_at.gt.${now}`)
      .order("published_at", { ascending: false })
      .limit(100),
    db
      .from("deadlines")
      .select("*")
      .eq("is_sample", false)
      .not("verified_at", "is", null)
      .gt("deadline_at", now)
      .order("deadline_at")
      .limit(100),
    db.from("official_sources").select("*").eq("active", true),
  ]);
  return {
    notices: ((n.data || []) as Notice[]).filter((notice) =>
      isPublicNotice(notice, nowDate),
    ),
    deadlines: ((d.data || []) as Deadline[]).filter((deadline) =>
      isPublicDeadline(deadline, nowDate),
    ),
    sources: (s.data || []) as Source[],
    demo: false,
    error: n.error?.message || d.error?.message || s.error?.message || null,
  };
}
export async function noticeBySlug(slug: string, nowDate = new Date()) {
  if (previewMode()) {
    return (
      verifiedPreview.notices.find(
        (notice) =>
          notice.slug === slug && isPublicNotice(notice, nowDate),
      ) || null
    );
  }
  const db = await serverClient();
  if (!db) return null;
  const now = nowDate.toISOString();
  const { data } = await db
    .from("notices")
    .select("*")
    .eq("slug", slug)
    .eq("verification_status", "verified")
    .eq("is_sample", false)
    .lte("published_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .or(`end_at.is.null,end_at.gt.${now}`)
    .single();
  const notice = data as Notice | null;
  return notice && isPublicNotice(notice, nowDate) ? notice : null;
}
export async function deadlineById(id: string, nowDate = new Date()) {
  if (previewMode())
    return (
      verifiedPreview.deadlines.find(
        (deadline) =>
          deadline.id === id && isPublicDeadline(deadline, nowDate),
      ) || null
    );
  const db = await serverClient();
  if (!db) return null;
  const now = nowDate.toISOString();
  const { data } = await db
    .from("deadlines")
    .select("*")
    .eq("id", id)
    .eq("is_sample", false)
    .not("verified_at", "is", null)
    .gt("deadline_at", now)
    .single();
  const deadline = data as Deadline | null;
  return deadline && isPublicDeadline(deadline, nowDate) ? deadline : null;
}
