import type { Deadline, Notice, Source } from "@/types";
import { community } from "@/config/community";

const source: Source = {
  id: "cb111111-1111-4111-8111-111111111111",
  community_id: community.id,
  name: "County of Brant News",
  organization: "County of Brant",
  source_type: "website",
  url: "https://www.brant.ca/news/",
  description: "Official County of Brant public notices and service updates for Paris, Ontario.",
  authority_level: "official",
  ingestion_type: "manual",
  ingestion_enabled: false,
  refresh_interval_minutes: 60,
  last_checked_at: "2026-09-15T14:24:00-04:00",
  last_success_at: "2026-09-15T14:24:00-04:00",
  active: true,
};

const notice: Notice = {
  id: "ca111111-1111-4111-8111-111111111111",
  community_id: community.id,
  source_id: source.id,
  external_id: "street-lighting-installation-on-powerline-road-in-paris",
  title: "Street lighting installation on Powerline Road",
  slug: "street-lighting-installation-on-powerline-road",
  summary:
    "County of Brant is installing 17 LED streetlights on Powerline Road near Mile Hill Road, Brewis Street, Hitchman Street and Whiting Drive. No road closures or detours are planned.",
  body:
    "Reviewed official County of Brant notice. Work is expected from September 14 to October 12, 2026. Driveway and property access will be maintained where possible.",
  category: "construction",
  severity: "important",
  official_url:
    "https://www.brant.ca/news/posts/street-lighting-installation-on-powerline-road-in-paris/",
  published_at: "2026-09-09T12:00:00-04:00",
  source_updated_at: "2026-09-09T12:00:00-04:00",
  retrieved_at: "2026-09-15T14:24:00-04:00",
  verified_at: "2026-09-15T14:24:00-04:00",
  start_at: "2026-09-14T00:00:00-04:00",
  end_at: "2026-10-12T23:59:59-04:00",
  expires_at: "2026-10-13T00:00:00-04:00",
  address_text: "Powerline Road near Mile Hill Road, Brewis Street, Hitchman Street and Whiting Drive",
  latitude: 43.1945,
  longitude: -80.3844,
  affected_area_text: "Powerline Road corridor",
  city: "Paris",
  tags_json: ["construction", "roads", "powerline-road"],
  verification_status: "verified",
  confidence_score: 1,
  is_sample: false,
};

const deadline: Deadline = {
  id: "da111111-1111-4111-8111-111111111111",
  notice_id: notice.id,
  community_id: community.id,
  title: "Powerline Road lighting work ends",
  description: "Expected end date for the source-linked Powerline Road lighting installation.",
  category: "construction",
  starts_at: notice.start_at,
  deadline_at: "2026-10-12T23:59:59-04:00",
  official_url: notice.official_url,
  latitude: notice.latitude,
  longitude: notice.longitude,
  source_id: source.id,
  verified_at: notice.verified_at,
  is_sample: false,
};

export const verifiedPreview = {
  notices: [notice],
  deadlines: [deadline],
  sources: [source],
  demo: false,
  error: null,
};
