import type { Notice } from "@/types";
import { isPublicNotice } from "./public-content";

export const eventPeriods = { weekend: "This weekend", today: "Today", week: "Next 7 days", month: "Next 30" } as const;
export const eventTags = ["family", "free", "markets", "outdoors", "arts"] as const;
export type EventFilters = { when: keyof typeof eventPeriods; tags: string[] };
export function parseEventFilters(params: URLSearchParams): EventFilters {
  const when = params.get("when") || "weekend";
  return { when: Object.hasOwn(eventPeriods, when) ? when as EventFilters["when"] : "weekend", tags: eventTags.filter(tag => params.getAll("tag").includes(tag)) };
}
export function eventFilterUrl(path: string, params: URLSearchParams, filters: EventFilters) {
  const next = new URLSearchParams(params);
  next.set("when", filters.when);
  next.delete("tag");
  eventTags.filter(tag => filters.tags.includes(tag)).forEach(tag => next.append("tag", tag));
  return `${path}?${next}`;
}
export function eventDay(date: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
}
function addDays(day: string, count: number) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
}
export function realEvents(notices: Notice[], now = new Date()) {
  return notices.filter(n => n.category === "event" && isPublicNotice(n, now) && n.verified_at && /^https:\/\//.test(n.official_url) && n.start_at && Number.isFinite(Date.parse(n.start_at)));
}
export function filterEvents(notices: Notice[], filters: EventFilters, now = new Date()) {
  const today = eventDay(now);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const start = filters.when === "weekend" ? addDays(today, weekday === 0 ? -1 : (6 - weekday + 7) % 7) : today;
  const end = addDays(start, filters.when === "weekend" ? 2 : filters.when === "today" ? 1 : filters.when === "week" ? 7 : 30);
  return realEvents(notices, now).filter(n => {
    const day = eventDay(n.start_at!);
    const lastDay = n.end_at && Number.isFinite(Date.parse(n.end_at)) ? eventDay(n.end_at) : day;
    return day < end && lastDay >= start && filters.tags.every(tag => n.tags_json.map(t => t.toLowerCase()).includes(tag));
  }).sort((a, b) => Date.parse(a.start_at!) - Date.parse(b.start_at!));
}
