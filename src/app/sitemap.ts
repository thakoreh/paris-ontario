import type { MetadataRoute } from "next";
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

export default function sitemap(): MetadataRoute.Sitemap {
  const base = normalizePublicUrl();
  if (!base) return [];
  return routes.map(([path, changeFrequency, priority, reviewedAt]) => ({
    url: sitePath(base, path)!,
    ...(reviewedAt ? { lastModified: new Date(`${reviewedAt}T00:00:00.000Z`) } : {}),
    changeFrequency,
    priority,
  }));
}
