import type { MetadataRoute } from "next";
import { publicData } from "@/lib/repository";
import {
  contentLastModified,
  isPublicDeadline,
  isPublicNotice,
} from "@/lib/public-content";
import { normalizePublicUrl, sitePath } from "@/lib/site";

type SitemapEntry = [
  string,
  MetadataRoute.Sitemap[number]["changeFrequency"],
  number,
  string?,
];

// Static routes omit lastModified unless a durable publication/review date is known.
const routes: SitemapEntry[] = [
  ["/", "daily", 1],
  ["/today", "hourly", 0.9],
  ["/storm", "hourly", 0.9],
  ["/deadlines", "daily", 0.8],
  ["/events", "daily", 0.8],
  ["/map", "daily", 0.7],
  ["/sources", "weekly", 0.8],
  ["/paris-ontario", "monthly", 0.9, "2026-09-15"],
  ["/services", "monthly", 0.9, "2026-09-15"],
  ["/new-to-paris", "monthly", 0.8, "2026-09-15"],
  ["/editorial-policy", "monthly", 0.7],
  ["/privacy", "monthly", 0.5],
  ["/terms", "monthly", 0.5],
  ["/contact", "monthly", 0.6],
  ["/about", "monthly", 0.6],
];

function staticEntries(base: URL): MetadataRoute.Sitemap {
  return routes.map(([path, changeFrequency, priority, reviewedAt]) => ({
    url: sitePath(base, path)!,
    ...(reviewedAt ? { lastModified: new Date(`${reviewedAt}T00:00:00.000Z`) } : {}),
    changeFrequency,
    priority,
  }));
}

export async function buildSitemap(
  now = new Date(),
): Promise<MetadataRoute.Sitemap> {
  const base = normalizePublicUrl();
  if (!base) return [];

  const entries = staticEntries(base);
  const data = await publicData(now);
  if (data.error) return entries;

  const notices = data.notices
    .filter((notice) => isPublicNotice(notice, now))
    .map((notice) => ({
      url: sitePath(base, `/notice/${encodeURIComponent(notice.slug)}`)!,
      ...(contentLastModified(notice)
        ? { lastModified: new Date(contentLastModified(notice)!) }
        : {}),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  const deadlines = data.deadlines
    .filter((deadline) => isPublicDeadline(deadline, now))
    .map((deadline) => ({
      url: sitePath(base, `/deadline/${encodeURIComponent(deadline.id)}`)!,
      ...(contentLastModified({
        verified_at: deadline.verified_at,
        created_at: deadline.created_at,
      })
        ? {
            lastModified: new Date(
              contentLastModified({
                verified_at: deadline.verified_at,
                created_at: deadline.created_at,
              })!,
            ),
          }
        : {}),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

  return [...entries, ...notices, ...deadlines];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap();
}
