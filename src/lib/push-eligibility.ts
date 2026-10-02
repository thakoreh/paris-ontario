import { haversine, severityRank } from "./relevance";
import type { Location, Notice, Preferences } from "@/types";

export const PUSH_TIME_ZONE = "America/Toronto";
export type PushLocation = Pick<
  Location,
  "community_id" | "latitude" | "longitude"
>;
export type PushPreferences = Pick<
  Preferences,
  | "push_enabled"
  | "categories_json"
  | "radius_km"
  | "minimum_severity"
  | "quiet_hours_start"
  | "quiet_hours_end"
>;
export type PushNotice = Pick<
  Notice,
  | "community_id"
  | "category"
  | "severity"
  | "latitude"
  | "longitude"
  | "affected_radius_km"
  | "verification_status"
  | "is_sample"
  | "published_at"
  | "expires_at"
  | "end_at"
>;

function minutes(value: string | null): number | null {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.test(value))
    return null;
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

/** Incomplete/invalid quiet hours fail closed. Equal endpoints mean quiet all day. */
export function isPushQuietTime(
  preferences: PushPreferences,
  now: Date,
): boolean {
  const startValue = preferences.quiet_hours_start;
  const endValue = preferences.quiet_hours_end;
  if (startValue === null && endValue === null) return false;
  const start = minutes(startValue);
  const end = minutes(endValue);
  if (start === null || end === null || start === end) return true;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PUSH_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const current =
    Number(parts.find((p) => p.type === "hour")?.value) * 60 +
    Number(parts.find((p) => p.type === "minute")?.value);
  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
}

export function isPushNoticeCurrent(
  notice: PushNotice,
  now = new Date(),
): boolean {
  if (
    !Number.isFinite(+now) ||
    notice.verification_status !== "verified" ||
    notice.is_sample !== false
  )
    return false;
  const published = Date.parse(notice.published_at);
  if (!Number.isFinite(published) || published > +now) return false;
  return [notice.expires_at, notice.end_at].every(
    (value) =>
      value == null ||
      (Number.isFinite(Date.parse(value)) && Date.parse(value) > +now),
  );
}

function validPoint(point: PushLocation): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}

/** Delivery is stricter than feed ranking: interests are a filter, never just a boost. */
export function isPersonalizedPushEligible(
  notice: PushNotice,
  locations: PushLocation[],
  preferences: PushPreferences | null | undefined,
  now = new Date(),
): boolean {
  if (
    !preferences ||
    preferences.push_enabled !== true ||
    !isPushNoticeCurrent(notice, now)
  )
    return false;
  if (
    !Array.isArray(preferences.categories_json) ||
    !preferences.categories_json.includes(notice.category)
  )
    return false;
  const minimum = severityRank[preferences.minimum_severity];
  const severity = severityRank[notice.severity];
  if (
    typeof minimum !== "number" ||
    typeof severity !== "number" ||
    severity < minimum
  )
    return false;
  const radius = preferences.radius_km;
  if (
    !Number.isFinite(radius) ||
    radius < 0 ||
    isPushQuietTime(preferences, now)
  )
    return false;
  const places = locations.filter(
    (location) =>
      location.community_id === notice.community_id && validPoint(location),
  );
  if (!places.length) return false;
  // Explicit All Paris is the only opt-in to notices without a verified map point.
  // Never infer that a coordinate-free street notice affects every resident.
  if (notice.latitude === null && notice.longitude === null)
    return radius === 0;
  if (notice.latitude === null || notice.longitude === null) return false;
  const point = {
    community_id: notice.community_id,
    latitude: notice.latitude,
    longitude: notice.longitude,
  };
  if (!validPoint(point)) return false;
  const affectedRadius = notice.affected_radius_km ?? 0;
  if (!Number.isFinite(affectedRadius) || affectedRadius < 0) return false;
  return (
    radius === 0 ||
    places.some(
      (location) => haversine(location, point) <= radius + affectedRadius,
    )
  );
}
