import { serverClient } from "./supabase/server";
import { createSeed } from "@/data/seed";
import type { Notice, Deadline, Source } from "@/types";
export async function publicData() {
  const db = await serverClient();
  if (!db) return { ...createSeed(), demo: true, error: null };
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
  const db = await serverClient();
  if (!db) return createSeed().notices.find((n) => n.slug === slug) || null;
  const { data } = await db
    .from("notices")
    .select("*")
    .eq("slug", slug)
    .single();
  return data as Notice | null;
}
export async function deadlineById(id: string) {
  const db = await serverClient();
  if (!db) return createSeed().deadlines.find((d) => d.id === id) || null;
  const { data } = await db.from("deadlines").select("*").eq("id", id).single();
  return data as Deadline | null;
}
