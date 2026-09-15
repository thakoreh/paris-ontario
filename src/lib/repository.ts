import { serverClient } from "./supabase/server";
import type { Notice, Deadline, Source } from "@/types";
import { verifiedPreview } from "@/data/verified-preview";

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

export async function publicData() {
  if (previewMode()) return verifiedPreview;
  const db = await serverClient();
  if (!db) return unavailable;
  const now = new Date().toISOString();
  const [n, d, s] = await Promise.all([
    db
      .from("notices")
      .select("*")
      .eq("verification_status", "verified")
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .or(`end_at.is.null,end_at.gt.${now}`)
      .order("published_at", { ascending: false })
      .limit(100),
    db
      .from("deadlines")
      .select("*")
      .gte("deadline_at", now)
      .order("deadline_at")
      .limit(100),
    db.from("official_sources").select("*").eq("active", true),
  ]);
  return {
    notices: (n.data || []) as Notice[],
    deadlines: (d.data || []) as Deadline[],
    sources: (s.data || []) as Source[],
    demo: false,
    error: n.error?.message || d.error?.message || s.error?.message || null,
  };
}
export async function noticeBySlug(slug: string) {
  if (previewMode())
    return verifiedPreview.notices.find((notice) => notice.slug === slug) || null;
  const db = await serverClient();
  if (!db) return null;
  const { data } = await db
    .from("notices")
    .select("*")
    .eq("slug", slug)
    .single();
  return data as Notice | null;
}
export async function deadlineById(id: string) {
  if (previewMode())
    return verifiedPreview.deadlines.find((deadline) => deadline.id === id) || null;
  const db = await serverClient();
  if (!db) return null;
  const { data } = await db.from("deadlines").select("*").eq("id", id).single();
  return data as Deadline | null;
}
