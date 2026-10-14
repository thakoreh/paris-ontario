import type { Deadline, Notice } from "@/types";
export function calendarEvent(d: Deadline | Notice) {
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
    "PRODID:-//Paris Pulse//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${d.id}@parispulse.local`,
    `DTSTAMP:${date(new Date().toISOString())}`,
    `DTSTART:${date("deadline_at" in d ? d.deadline_at : d.start_at!)}`,
    ...(!("deadline_at" in d) && d.end_at ? [`DTEND:${date(d.end_at)}`] : []),
    ...(!("deadline_at" in d) && d.address_text ? [`LOCATION:${escape(d.address_text)}`] : []),
    `SUMMARY:${escape((d.is_sample ? "[Sample data] " : "") + d.title)}`,
    `DESCRIPTION:${escape("description" in d ? d.description : d.summary)}`,
    `URL:${d.official_url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].map(foldCalendarLine).join("\r\n") + "\r\n";
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

// RFC 5545 folds at 75 octets without splitting UTF-8 characters.
function foldCalendarLine(line: string) {
  let result = "", part = "", bytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 75) { result += part + "\r\n"; part = " "; bytes = 1; }
    part += char; bytes += size;
  }
  return result + part;
}
