import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return [
    "",
    "/today",
    "/storm",
    "/deadlines",
    "/map",
    "/events",
    "/sources",
    "/about",
    "/disclaimer",
  ].map((path) => ({
    url: base + path,
    changeFrequency: "daily",
    priority: path ? 0.7 : 1,
  }));
}
