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
  const start = "deadline_at" in d ? d.deadline_at : d.start_at!;
  const allDay = /^\d{4}-\d{2}-\d{2}$/.test(start);
  const end = !allDay && !("deadline_at" in d) && d.end_at ? d.end_at :
    new Date(+new Date(start) + (allDay ? 86400000 : 3600000)).toISOString();
  const local = (value: string) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(value));
    const part = (name: string) => parts.find((p) => p.type === name)!.value;
    return `${part("year")}${part("month")}${part("day")}T${part("hour")}${part("minute")}${part("second")}`;
  };
  const dateOnly = (value: string) => value.slice(0, 10).replace(/-/g, "");
  // A timed event that ends on a later Toronto day is exported as an all-day
  // range: sources give only an overall start and end, not daily hours.
  const multiDay = !allDay && local(start).slice(0, 8) !== local(end).slice(0, 8);
  const nextDay = (ymd: string) => {
    const d = new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8) + 1));
    return d.toISOString().slice(0, 10).replace(/-/g, "");
  };
  const human = (value: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto", weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).format(new Date(value));
  const baseDescription = "description" in d ? d.description : d.summary;
  const description = multiDay
    ? `${baseDescription}\n\nListed as starting ${human(start)} and ending ${human(end)} (Toronto time). Check the official listing for daily hours.`
    : baseDescription;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Paris Pulse//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VTIMEZONE",
    "TZID:America/Toronto",
    "BEGIN:STANDARD",
    "DTSTART:20071104T020000",
    "TZOFFSETFROM:-0400",
    "TZOFFSETTO:-0500",
    "TZNAME:EST",
    "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:20070311T020000",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0400",
    "TZNAME:EDT",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${d.id}@parispulse.local`,
    `DTSTAMP:${date(new Date().toISOString())}`,
    allDay ? `DTSTART;VALUE=DATE:${dateOnly(start)}`
      : multiDay ? `DTSTART;VALUE=DATE:${local(start).slice(0, 8)}`
      : `DTSTART;TZID=America/Toronto:${local(start)}`,
    allDay ? `DTEND;VALUE=DATE:${dateOnly(end)}`
      : multiDay ? `DTEND;VALUE=DATE:${nextDay(local(end).slice(0, 8))}`
      : `DTEND;TZID=America/Toronto:${local(end)}`,
    ...(!("deadline_at" in d) && d.address_text ? [`LOCATION:${escape(d.address_text)}`] : []),
    `SUMMARY:${escape((d.is_sample ? "[Sample data] " : "") + d.title)}`,
    `DESCRIPTION:${escape(description)}`,
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
