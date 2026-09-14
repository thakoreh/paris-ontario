export const categories = [
  "roads",
  "construction",
  "planning",
  "recreation",
  "facility",
  "event",
  "transit",
  "downtown",
  "public_notice",
  "waste",
  "storm",
  "outage",
  "emergency",
  "other",
] as const;
export type Category = (typeof categories)[number];
export type Severity = "info" | "useful" | "important" | "urgent";
export type Role = "user" | "editor" | "admin";
export type Authority =
  | "official"
  | "official_agency"
  | "trusted_local_org"
  | "trusted_media"
  | "community_signal";
export interface Community {
  id: string;
  slug: string;
  name: string;
  province: string;
  country: string;
  latitude: number;
  longitude: number;
  default_radius_km: number;
  active: boolean;
}
export interface Source {
  id: string;
  community_id: string | null;
  name: string;
  organization: string;
  source_type: string;
  url: string;
  feed_url?: string | null;
  description: string;
  authority_level: Authority;
  ingestion_type: "manual" | "rss" | "html" | "api" | "open_data";
  ingestion_enabled: boolean;
  refresh_interval_minutes: number;
  last_checked_at: string | null;
  last_success_at: string | null;
  active: boolean;
}
export interface Notice {
  id: string;
  community_id: string;
  source_id: string;
  external_id?: string | null;
  title: string;
  slug: string;
  summary: string;
  body?: string | null;
  category: Category;
  severity: Severity;
  official_url: string;
  published_at: string;
  source_updated_at?: string | null;
  retrieved_at: string;
  verified_at: string | null;
  start_at?: string | null;
  end_at?: string | null;
  expires_at?: string | null;
  address_text?: string | null;
  latitude: number | null;
  longitude: number | null;
  affected_radius_km?: number | null;
  affected_area_text?: string | null;
  city: string;
  tags_json: string[];
  verification_status:
    "draft" | "needs_review" | "verified" | "expired" | "rejected";
  confidence_score: number;
  is_sample: boolean;
  created_at?: string;
  updated_at?: string;
}
export interface Deadline {
  id: string;
  notice_id?: string | null;
  community_id: string;
  title: string;
  description: string;
  category: Category;
  starts_at?: string | null;
  deadline_at: string;
  official_url: string;
  latitude: number | null;
  longitude: number | null;
  source_id: string;
  verified_at: string | null;
  is_sample: boolean;
  created_at?: string;
}
export interface Location {
  id: string;
  user_id: string;
  community_id: string;
  label: string;
  address_line: string;
  city: string;
  province: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  location_type: "home" | "work" | "school" | "other";
  is_primary: boolean;
}
export interface Preferences {
  categories_json: Category[];
  radius_km: number;
  minimum_severity: Severity;
  instant_enabled: boolean;
  daily_digest_enabled: boolean;
  weekly_digest_enabled: boolean;
  deadline_reminders_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}
export interface Match {
  notice: Notice;
  relevance_score: number;
  distance_km: number | null;
  location_id: string | null;
  match_reasons_json: string[];
}
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
}
export interface Reminder {
  deadline_id: string;
  minutes_before: number;
}
export interface PersonalState {
  profile: Profile | null;
  locations: Location[];
  preferences: Preferences;
  saved: string[];
  read: string[];
  dismissed: string[];
  reminders: Reminder[];
}
export const categoryLabels: Record<Category, string> = {
  roads: "Roads & traffic",
  construction: "Construction",
  planning: "Planning & development",
  recreation: "Family & recreation",
  facility: "Facilities",
  event: "Events",
  transit: "Transit",
  downtown: "Downtown Paris",
  public_notice: "Municipal notices",
  waste: "Waste & services",
  storm: "Storms",
  outage: "Power & outages",
  emergency: "Emergency",
  other: "Community",
};
