import type { Match, Notice } from "@/types";

export type NoticeKind = "change" | "event" | "business" | "community";

/** An opening needs an explicit editorial tag, never a guess from its title. */
export function noticeKind(notice: Notice): NoticeKind {
  if (notice.category === "event") return "event";
  if (
    notice.tags_json.some((tag) =>
      ["business_opening", "new_business"].includes(
        tag.trim().toLowerCase().replace(/[ -]+/g, "_"),
      ),
    )
  )
    return "business";
  if (
    [
      "roads",
      "construction",
      "transit",
      "storm",
      "outage",
      "emergency",
      "facility",
      "waste",
    ].includes(notice.category)
  )
    return "change";
  return "community";
}

export function validVisitCheckpoint(
  value: string | null,
  now = new Date(),
): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.getTime() <= now.getTime()
    ? date.toISOString()
    : null;
}

/** Ignore retrieval, verification and database-edit timestamps. */
export function latestPublicChangeAt(
  notice: Notice,
  now = new Date(),
): string | null {
  const dates = [notice.published_at, notice.source_updated_at]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value) && value <= now.getTime());
  return dates.length ? new Date(Math.max(...dates)).toISOString() : null;
}

/** Verification/retrieval alone is not a newly published or changed notice. */
export function changedSinceVisit(
  notice: Notice,
  checkpoint: string | null,
  now = new Date(),
) {
  const visit = validVisitCheckpoint(checkpoint, now);
  if (!visit || notice.is_sample || notice.verification_status !== "verified")
    return false;
  const changed = latestPublicChangeAt(notice, now);
  return Boolean(
    changed && new Date(changed).getTime() > new Date(visit).getTime(),
  );
}

/** Every notice has one home on Today, including when it is newly updated. */
export function groupTodayMatches(
  matches: Match[],
  checkpoint: string | null,
  now = new Date(),
) {
  const groups: Record<NoticeKind | "new", Match[]> = {
    new: [],
    change: [],
    event: [],
    business: [],
    community: [],
  };
  const seen = new Set<string>();
  for (const match of matches) {
    if (seen.has(match.notice.id)) continue;
    seen.add(match.notice.id);
    const group = changedSinceVisit(match.notice, checkpoint, now)
      ? "new"
      : noticeKind(match.notice);
    groups[group].push(match);
  }
  return groups;
}

export const areaScopeStorageKey = "paris-pulse-area-scope";
export const visitStoragePrefix = "paris-pulse-last-visit:";
