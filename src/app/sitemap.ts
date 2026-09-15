import type { MetadataRoute } from "next";
import { normalizePublicUrl, sitePath } from "@/lib/site";

const routes: Array<[string, MetadataRoute.Sitemap[number]["changeFrequency"], number]> = [
  ["/", "daily", 1],
  ["/today", "hourly", 0.9],
  ["/storm", "hourly", 0.9],
  ["/deadlines", "daily", 0.8],
  ["/events", "daily", 0.8],
  ["/map", "daily", 0.7],
  ["/sources", "weekly", 0.8],
  ["/services", "monthly", 0.9],
  ["/new-to-paris", "monthly", 0.8],
  ["/editorial-policy", "monthly", 0.7],
  ["/privacy", "monthly", 0.5],
  ["/terms", "monthly", 0.5],
  ["/contact", "monthly", 0.6],
  ["/about", "monthly", 0.6],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = normalizePublicUrl();
  if (!base) return [];
  const lastModified = new Date();
  return routes.map(([path, changeFrequency, priority]) => ({
    url: sitePath(base, path)!,
    lastModified,
    changeFrequency,
    priority,
  }));
}
