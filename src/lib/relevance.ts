import type { Notice, Location, Preferences, Match, Deadline } from "@/types";
import { categoryLabels } from "@/types";
export const severityRank = { info: 0, useful: 1, important: 2, urgent: 3 };
export function haversine(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const r = Math.PI / 180;
  const x =
    Math.sin(((b.latitude - a.latitude) * r) / 2) ** 2 +
    Math.cos(a.latitude * r) *
      Math.cos(b.latitude * r) *
      Math.sin(((b.longitude - a.longitude) * r) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
}
export function isExpired(n: Notice, now = new Date()) {
  return (
    n.verification_status === "expired" ||
    [n.expires_at, n.end_at].some(
      (d) => d && new Date(d).getTime() <= now.getTime(),
    )
  );
}
export function deadlineScore(
  d: Pick<Deadline, "deadline_at">,
  now = new Date(),
) {
  const h = (+new Date(d.deadline_at) - +now) / 3600000;
  return h < 0 ? 0 : h <= 24 ? 20 : h <= 168 ? 10 : 0;
}
export function distanceLabel(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
export function scoreNotice(
  n: Notice,
  locations: Location[],
  preferences: Preferences,
  now = new Date(),
  deadlines: Deadline[] = [],
): Match | null {
  if (
    n.verification_status !== "verified" ||
    isExpired(n, now) ||
    severityRank[n.severity] < severityRank[preferences.minimum_severity]
  )
    return null;
  const hadLocations = locations.length > 0;
  locations = locations.filter((l) => l.community_id === n.community_id);
  if (hadLocations && !locations.length) return null;
  const hasCoords = n.latitude !== null && n.longitude !== null;
  const nearest = hasCoords
    ? locations
        .map((l) => ({
          l,
          d: haversine(l, { latitude: n.latitude!, longitude: n.longitude! }),
        }))
        .sort((a, b) => a.d - b.d)[0]
    : undefined;
  const wide =
    !hasCoords &&
    (/all|wide/i.test(n.affected_area_text || "") ||
      locations.some((l) => l.city.toLowerCase() === n.city.toLowerCase()));
  const textMatch = !hasCoords
    ? locations.find((l) => {
        const street = l.address_line.replace(/^\d+\s*/, "").toLowerCase();
        return (
          street.length > 4 &&
          `${n.address_text} ${n.affected_area_text} ${n.summary}`
            .toLowerCase()
            .includes(street)
        );
      })
    : undefined;
  const distance = nearest?.d ?? null;
  const radius = preferences.radius_km;
  if (
    locations.length &&
    radius > 0 &&
    distance !== null &&
    distance > radius + (n.affected_radius_km || 0)
  )
    return null;
  if (locations.length && !hasCoords && !wide && !textMatch) return null;
  const interest = preferences.categories_json.includes(n.category);
  const reasons: string[] = [];
  let score = 10;
  if (distance !== null) {
    score =
      distance < 0.5
        ? 50
        : distance < 1
          ? 40
          : distance < 3
            ? 30
            : distance < 5
              ? 20
              : 10;
    reasons.push(`${distanceLabel(distance)} from ${nearest!.l.label}`);
    score += 20;
    reasons.push(
      radius > 0 ? `Within your ${radius} km radius` : "Monitoring all Paris",
    );
  } else
    reasons.push(
      textMatch
        ? `Near ${textMatch.label} (area match)`
        : `Affects all of ${n.city}`,
    );
  if (interest) {
    score += 25;
    reasons.push(`Matches ${categoryLabels[n.category]}`);
  }
  score += n.severity === "urgent" ? 30 : n.severity === "important" ? 20 : 0;
  const age = +now - +new Date(n.source_updated_at || n.published_at);
  if (age >= 0 && age < 7200000) {
    score += 10;
    reasons.push("Updated within the last 2 hours");
  }
  const bonus = Math.max(
    0,
    ...deadlines
      .filter((d) => d.notice_id === n.id)
      .map((d) => deadlineScore(d, now)),
  );
  score += bonus;
  if (bonus)
    reasons.push(
      bonus === 20 ? "Deadline within 24 hours" : "Deadline within 7 days",
    );
  return {
    notice: n,
    relevance_score: Math.min(100, score),
    distance_km: distance,
    location_id: nearest?.l.id || textMatch?.id || null,
    match_reasons_json: reasons,
  };
}
export function rankMatches(
  matches: Match[],
  authority: (sourceId: string) => string,
) {
  return matches.sort((a, b) => {
    const official = (m: Match) =>
      ["official", "official_agency"].includes(authority(m.notice.source_id));
    return (
      Number(b.notice.severity === "urgent" && official(b)) -
        Number(a.notice.severity === "urgent" && official(a)) ||
      b.relevance_score - a.relevance_score ||
      +new Date(b.notice.published_at) - +new Date(a.notice.published_at)
    );
  });
}
export function canInstantAlert(n: Notice, authority: string) {
  return (
    !n.is_sample &&
    n.verification_status === "verified" &&
    !isExpired(n) &&
    ["official", "official_agency"].includes(authority) &&
    n.category !== "event" &&
    (n.severity === "urgent" ||
      (n.severity === "important" &&
        ["roads", "facility", "storm", "emergency"].includes(n.category)))
  );
}

export function relevantDeadline(
  d: Deadline,
  locations: Location[],
  preferences: Preferences,
) {
  if (!preferences.categories_json.includes(d.category)) return false;
  if (
    preferences.radius_km === 0 ||
    d.latitude === null ||
    d.longitude === null
  )
    return true;
  return locations.some(
    (l) =>
      l.community_id === d.community_id &&
      haversine(l, { latitude: d.latitude!, longitude: d.longitude! }) <=
        preferences.radius_km,
  );
}
