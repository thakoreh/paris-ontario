import type { MetadataRoute } from "next";
import { normalizePublicUrl, sitePath } from "@/lib/site";

const privatePaths = ["/app", "/admin", "/api", "/onboarding", "/login", "/signup", "/forgot-password", "/reset-password", "/auth"];

export default function robots(): MetadataRoute.Robots {
  const base = normalizePublicUrl();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: privatePaths },
      { userAgent: "ChatGPT-User", allow: "/", disallow: privatePaths },
      { userAgent: "ClaudeBot", allow: "/", disallow: privatePaths },
      { userAgent: "PerplexityBot", allow: "/", disallow: privatePaths },
      { userAgent: "Google-Extended", allow: "/", disallow: privatePaths },
    ],
    sitemap: sitePath(base, "/sitemap.xml") || undefined,
  };
}
