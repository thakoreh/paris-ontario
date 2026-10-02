import type { Notice } from "@/types";
import { isExpired } from "@/lib/relevance";

const zone = "America/Toronto";

export function localDateKey(value: string | Date): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Calendar-day bounds in Paris, including the current Saturday/Sunday. */
export function weekendDates(now = new Date()) {
  const day = new Date(`${localDateKey(now)}T12:00:00Z`);
  const weekday = day.getUTCDay();
  day.setUTCDate(day.getUTCDate() + (weekday === 0 ? -1 : 6 - weekday));
  const start = day.toISOString().slice(0, 10);
  day.setUTCDate(day.getUTCDate() + 1);
  return { start, end: day.toISOString().slice(0, 10) };
}

export function isThisWeekend(n: Notice, now = new Date()) {
  if (
    n.category !== "event" ||
    n.verification_status !== "verified" ||
    isExpired(n, now) ||
    !n.start_at
  )
    return false;
  const start = localDateKey(n.start_at);
  const end = localDateKey(n.end_at || n.start_at);
  const weekend = weekendDates(now);
  return Boolean(start && end && start <= weekend.end && end >= weekend.start);
}

export function noticeDateLabel(n: Notice) {
  const date = (value: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  if (n.start_at && localDateKey(n.start_at)) {
    const end =
      n.end_at && localDateKey(n.end_at) !== localDateKey(n.start_at)
        ? ` – ${date(n.end_at)}`
        : "";
    return `${n.category === "event" ? "Happening" : "From"} ${date(n.start_at)}${end}`;
  }
  return `Published ${date(n.published_at)}`;
}

export function latestVerification(notices: Notice[]) {
  return (
    notices
      .filter(
        (n) =>
          !n.is_sample && n.verification_status === "verified" && n.verified_at,
      )
      .map((n) => n.verified_at!)
      .filter((at) => Number.isFinite(new Date(at).getTime()))
      .sort((a, b) => +new Date(b) - +new Date(a))[0] || null
  );
}
