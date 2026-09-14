import { z } from "zod";
import { categories } from "@/types";
export const sourceUrl = z
  .string()
  .url()
  .refine((value) => {
    try {
      const u = new URL(value);
      return (
        u.protocol === "https:" &&
        !/[\x00-\x1f\x7f]/.test(value) &&
        !u.username &&
        !u.password &&
        !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/i.test(
          u.hostname,
        ) &&
        !/^172\.(1[6-9]|2\d|3[01])\./.test(u.hostname)
      );
    } catch {
      return false;
    }
  }, "Use a public HTTPS source URL");
export const noticeSchema = z.object({
  title: z.string().min(5).max(200),
  summary: z.string().min(15).max(2000),
  category: z.enum(categories),
  severity: z.enum(["info", "useful", "important", "urgent"]),
  source_id: z.string().uuid(),
  official_url: sourceUrl,
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  affected_radius_km: z.number().min(0).max(100).nullable().optional(),
  address_text: z.string().max(300).optional(),
  affected_area_text: z.string().max(500).optional(),
  expires_at: z.string().datetime().nullable(),
  is_sample: z.boolean(),
  verification_status: z.enum([
    "draft",
    "needs_review",
    "verified",
    "expired",
    "rejected",
  ]),
});
export const locationSchema = z.object({
  label: z.string().min(1).max(50),
  address_line: z.string().min(3).max(300),
  postal_code: z.string().max(10),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  location_type: z.enum(["home", "work", "school", "other"]),
  is_primary: z.boolean(),
});
export function canEdit(role: string | null) {
  return role === "editor" || role === "admin";
}
export function ownsRow(userId: string | null, row: { user_id: string }) {
  return !!userId && userId === row.user_id;
}
export function duplicateScore(
  a: { title: string; official_url: string; published_at: string },
  b: { title: string; official_url: string; published_at: string },
) {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .split(/\s+/)
      .filter(Boolean);
  const x = new Set(norm(a.title)),
    y = new Set(norm(b.title));
  const similarity =
    [...x].filter((w) => y.has(w)).length / Math.max(x.size, y.size, 1);
  const sameDate = a.published_at.slice(0, 10) === b.published_at.slice(0, 10);
  return similarity === 1
    ? 1
    : similarity * 0.7 +
        (a.official_url === b.official_url && sameDate ? 0.3 : 0);
}
