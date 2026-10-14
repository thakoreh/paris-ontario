import { residentServices } from "@/data/resident-services";
import { parisResources } from "@/data/paris-resources";
import { trailEntries, visitingEntries } from "@/lib/explore-content";
import { isPublicNotice } from "@/lib/public-content";
import type { Notice } from "@/types";

export type SearchResult = {
  id: string;
  title: string;
  description: string;
  href: string;
  sourceUrl: string;
  keywords: string;
  kind: string;
};
export function searchSite(
  query: string,
  notices: Notice[],
  now = new Date(),
): SearchResult[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const entries: SearchResult[] = [
    ...residentServices.map((s) => ({
      id: `service-${s.id}`,
      title: s.title,
      description: s.description,
      href: `/services?q=${encodeURIComponent(s.title)}`,
      sourceUrl: s.url,
      keywords: s.keywords,
      kind: "Service",
    })),
    ...parisResources.map((r) => ({
      id: `guide-${r.id}`,
      title: r.title,
      description: r.summary,
      href: "/paris-ontario",
      sourceUrl: r.sources[0].url,
      keywords: `${r.keywords} ${r.task}`,
      kind: "Guide",
    })),
    ...residentServices
      .filter((s) =>
        [
          "address",
          "waste",
          "library",
          "transit",
          "recreation",
          "tax",
        ].includes(s.id),
      )
      .map((s) => ({
        id: `newcomer-${s.id}`,
        title: `New to Paris: ${s.title}`,
        description: s.description,
        href: "/new-to-paris",
        sourceUrl: s.url,
        keywords: `moving newcomer settling ${s.keywords}`,
        kind: "Guide",
      })),
    ...[...trailEntries, ...visitingEntries].map((e) => ({
      id: `explore-${e.id}`,
      title: e.title,
      description: e.description,
      href:
        e.href ||
        `/explore/${e.category === "trails" || e.category === "river" ? "trails" : "visiting"}`,
      sourceUrl: e.source_url,
      keywords: e.category,
      kind: "Explore",
    })),
    ...notices
      .filter(
        (n) => isPublicNotice(n, now) && /^https:\/\//.test(n.official_url),
      )
      .map((n) => ({
        id: `notice-${n.id}`,
        title: n.title,
        description: n.summary,
        href: `/notice/${n.slug}`,
        sourceUrl: n.official_url,
        keywords: `${n.category} ${n.tags_json.join(" ")}`,
        kind: "Notice",
      })),
  ];
  return entries.filter((e) =>
    terms.every((t) =>
      `${e.title} ${e.description} ${e.keywords}`.toLowerCase().includes(t),
    ),
  );
}
