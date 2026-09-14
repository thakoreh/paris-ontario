import type { Deadline } from "@/types";
export function calendarEvent(d: Deadline) {
  const escape = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const date = (s: string) =>
    new Date(s)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z/, "Z");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Paris Pulse//Deadlines//EN",
    "BEGIN:VEVENT",
    `UID:${d.id}@parispulse.local`,
    `DTSTAMP:${date(new Date().toISOString())}`,
    `DTSTART:${date(d.deadline_at)}`,
    `SUMMARY:${escape((d.is_sample ? "[Sample data] " : "") + d.title)}`,
    `DESCRIPTION:${escape(d.description)}`,
    `URL:${d.official_url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
export function countdown(date: string, now = new Date()) {
  const mins = Math.ceil((+new Date(date) - +now) / 60000);
  return mins <= 0
    ? "Past"
    : mins < 60
      ? `${mins}m left`
      : mins < 1440
        ? `${Math.floor(mins / 60)}h ${mins % 60}m left`
        : `${Math.floor(mins / 1440)} days left`;
}
