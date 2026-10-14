import type { Notice } from "@/types";
import { isPublicNotice } from "./public-content";

export type ExploreEntry = {
  id: string;
  title: string;
  description: string;
  category: "trails" | "river" | "downtown" | "visiting";
  source_url: string;
  reviewed_at: string;
  organization: string;
  href?: string;
};
const trailsUrl =
  "https://www.brant.ca/recreation-and-parks/outdoor-courts-sports-and-trails/trails/";
// Existing review dates are preserved when reusing repository content. New entries
// review only the linked destination; no distances, hours or live status are asserted.
export const trailEntries: ExploreEntry[] = [
  {
    id: "cambridge",
    title: "Cambridge to Paris Rail Trail",
    description:
      "Check the official route guidance, permitted uses and access information before you go.",
    category: "trails",
    source_url:
      "https://grandriver.ca/outdoor-recreation/trails/cambridge-to-paris-trail",
    reviewed_at: "2026-09-15",
    organization: "Grand River Conservation Authority",
  },
  {
    id: "sc-johnson",
    title: "SC Johnson Trail",
    description:
      "Find trail and access information through the County's official trail guide.",
    category: "trails",
    source_url: trailsUrl,
    reviewed_at: "2026-10-14",
    organization: "County of Brant",
  },
  {
    id: "grand-river",
    title: "Paddling the Grand River",
    description:
      "Check GRCA river conditions and recreation guidance before planning river access.",
    category: "river",
    source_url: "https://www.grandriver.ca/",
    reviewed_at: "2026-10-14",
    organization: "Grand River Conservation Authority",
  },
  {
    id: "watts-pond",
    title: "Watts Pond Trail",
    description: "Open the County's trail guide for route and access details.",
    category: "trails",
    source_url: trailsUrl,
    reviewed_at: "2026-10-14",
    organization: "County of Brant",
  },
];
export const visitingEntries: ExploreEntry[] = [
  {
    id: "downtown",
    title: "Downtown & eat",
    description: "Use the BIA's directory to explore places to eat and shop.",
    category: "downtown",
    source_url: "https://downtownparis.ca/visiting-us/",
    reviewed_at: "2026-10-14",
    organization: "Downtown Paris BIA",
  },
  {
    id: "parking",
    title: "Parking",
    description: "Check parking information and current rules with the County.",
    category: "visiting",
    source_url: "https://www.brant.ca/bylaws-and-animal-services/parking/",
    reviewed_at: "2026-10-14",
    organization: "County of Brant",
  },
  {
    id: "weekend",
    title: "This weekend",
    description:
      "Browse source-linked events, or open the BIA's event listings.",
    category: "visiting",
    source_url: "https://downtownparis.ca/events/",
    reviewed_at: "2026-10-14",
    organization: "Downtown Paris BIA",
    href: "/events",
  },
  {
    id: "history",
    title: "History",
    description: "Explore local history through the BIA's visitor guide.",
    category: "visiting",
    source_url: "https://downtownparis.ca/visiting-us/",
    reviewed_at: "2026-10-14",
    organization: "Downtown Paris BIA",
  },
  {
    id: "directions",
    title: "Plan your visit",
    description: "Find directions and visitor information through the BIA.",
    category: "visiting",
    source_url: "https://downtownparis.ca/visiting-us/",
    reviewed_at: "2026-10-14",
    organization: "Downtown Paris BIA",
  },
];
export const exploreCategories = [
  "all",
  "trails",
  "river",
  "downtown",
  "visiting",
] as const;
export type ExploreCategory = (typeof exploreCategories)[number];
export function filterExplore(
  entries: ExploreEntry[],
  category: ExploreCategory,
) {
  return entries.filter(
    (entry) =>
      category === "all" ||
      entry.category === category ||
      (category === "visiting" && entry.category === "downtown"),
  );
}
export type CouncilMeeting = {
  title: string;
  starts_at: string;
  source_url: string;
  reviewed_at: string;
  agenda_url: string;
  livestream_url?: string;
};
// Populate only with reviewed official records. Election content requires Hiren's approval.
export const councilConfig: {
  election: null;
  nextMeeting: CouncilMeeting | null;
  committees: CouncilMeeting[];
} = {
  election: null,
  nextMeeting: null,
  committees: [],
};
export const councilLinks = [
  {
    title: "Your councillor / ward",
    description:
      "Find councillors and ward information on the County's website.",
    source_url:
      "https://www.brant.ca/council-and-county-administration/council-and-committees/",
    reviewed_at: "2026-10-14",
  },
];
export function councilDecisions(notices: Notice[], now = new Date()) {
  return notices
    .filter(
      (n) =>
        isPublicNotice(n, now) &&
        n.verified_at &&
        /^https:\/\//.test(n.official_url) &&
        n.tags_json.some((tag) => tag.toLowerCase() === "council"),
    )
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
}
