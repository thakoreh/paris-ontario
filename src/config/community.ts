import type { Community, Preferences } from "@/types";
export const community: Community = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "paris-ontario",
  name: "Paris",
  province: "Ontario",
  country: "Canada",
  latitude: 43.1945,
  longitude: -80.3844,
  default_radius_km: 3,
  active: true,
};
export const defaultPreferences: Preferences = {
  categories_json: [
    "roads",
    "construction",
    "planning",
    "recreation",
    "storm",
    "outage",
    "emergency",
  ],
  radius_km: 3,
  minimum_severity: "info",
  instant_enabled: false,
  daily_digest_enabled: true,
  weekly_digest_enabled: false,
  deadline_reminders_enabled: true,
  email_enabled: true,
  push_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
};
