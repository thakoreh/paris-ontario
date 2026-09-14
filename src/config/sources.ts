import type { Source, Authority } from "@/types";
import { community } from "./community";
const definitions: [string, string, string, Authority][] = [
  [
    "County of Brant News",
    "County of Brant",
    "https://www.brant.ca/news/",
    "official",
  ],
  [
    "Public notices",
    "County of Brant",
    "https://www.brant.ca/news/",
    "official",
  ],
  [
    "Construction in Brant",
    "County of Brant",
    "https://www.brant.ca/construction",
    "official",
  ],
  [
    "Municipal511",
    "Municipal511",
    "https://www.municipal511.ca/",
    "official_agency",
  ],
  ["Engage Brant", "County of Brant", "https://engagebrant.ca/", "official"],
  [
    "Planning applications",
    "County of Brant",
    "https://www.brant.ca/",
    "official",
  ],
  [
    "Recreation & registration",
    "County of Brant",
    "https://www.brant.ca/",
    "official",
  ],
  ["Brant Transit", "County of Brant", "https://www.brant.ca/", "official"],
  [
    "Downtown Paris BIA",
    "Downtown Paris BIA",
    "https://www.downtownparis.ca/",
    "trusted_local_org",
  ],
  [
    "Paris Fairgrounds",
    "Paris Agricultural Society",
    "https://www.parisfairgrounds.com/",
    "trusted_local_org",
  ],
  [
    "Flood messages",
    "Grand River Conservation Authority",
    "https://www.grandriver.ca/news/flood-messages/",
    "official_agency",
  ],
  [
    "Emergency information",
    "County of Brant",
    "https://www.brant.ca/",
    "official",
  ],
  [
    "GrandBridge outage map",
    "GrandBridge Energy",
    "https://outages.grandbridgeenergy.com/Outages/",
    "official_agency",
  ],
  [
    "Library programming",
    "County of Brant Public Library",
    "https://www.brantlibrary.ca/",
    "official_agency",
  ],
  [
    "Local reporting",
    "Brantford Expositor",
    "https://www.brantfordexpositor.ca/",
    "trusted_media",
  ],
  [
    "Hydro One outages",
    "Hydro One",
    "https://www.hydroone.com/power-outages-and-safety",
    "official_agency",
  ],
];
export const sources: Source[] = definitions.map(
  ([name, organization, url, authority_level], i) => ({
    id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    community_id: community.id,
    name,
    organization,
    url,
    authority_level,
    source_type: "website",
    description:
      "Reference source. Manually curated; automated ingestion is not enabled. Verify service area and original details.",
    ingestion_type: "manual",
    ingestion_enabled: false,
    refresh_interval_minutes: 60,
    last_checked_at: null,
    last_success_at: null,
    active: true,
  }),
);
