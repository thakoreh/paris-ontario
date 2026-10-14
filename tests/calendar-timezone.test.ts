import { expect, it } from "vitest";
import { calendarEvent } from "@/lib/calendar";
import { createSeed } from "@/data/seed";
const event = createSeed().notices[0];
it.each([
  ["2026-01-10T15:00:00Z", "20260110T100000", "20260110T110000"],
  ["2026-07-10T14:00:00Z", "20260710T100000", "20260710T110000"],
  ["2026-03-08T06:30:00Z", "20260308T013000", "20260308T033000"],
])("exports Toronto times and one elapsed hour for %s", (start_at, start, end) => {
  const ics = calendarEvent({ ...event, start_at, end_at: null });
  expect(ics).toContain(`DTSTART;TZID=America/Toronto:${start}`);
  expect(ics).toContain(`DTEND;TZID=America/Toronto:${end}`);
  expect(ics).toContain("BEGIN:VTIMEZONE");
  expect(ics).toContain("RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU");
  expect(ics).toContain("RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU");
});
it("uses exclusive next-day DATE values for all-day events", () => {
  const ics = calendarEvent({ ...event, start_at: "2026-12-31", end_at: null });
  expect(ics).toContain("DTSTART;VALUE=DATE:20261231");
  expect(ics).toContain("DTEND;VALUE=DATE:20270101");
});
it("supplies a one-hour end for deadlines", () => {
  const ics = calendarEvent({ ...createSeed().deadlines[0], deadline_at: "2026-07-10T14:00:00Z" });
  expect(ics).toContain("DTEND;TZID=America/Toronto:20260710T110000");
});
it("exports an overnight multi-day event as an all-day range without inventing daily hours", () => {
  const ics = calendarEvent({
    ...event,
    start_at: "2026-10-24T15:00:00Z",
    end_at: "2026-10-25T20:00:00Z",
  });
  expect(ics).toContain("DTSTART;VALUE=DATE:20261024");
  expect(ics).toContain("DTEND;VALUE=DATE:20261026");
  expect(ics).not.toContain("DTSTART;TZID");
  const unfolded = ics.replace(/\r\n /g, "");
  expect(unfolded).toContain("Check the official listing for daily hours.");
  expect(unfolded).toMatch(/11:00/);
  expect(unfolded).toMatch(/16:00/);
});
it("keeps same-day timed events with their Toronto times", () => {
  const ics = calendarEvent({ ...event, start_at: "2026-10-24T15:00:00Z", end_at: "2026-10-24T20:00:00Z" });
  expect(ics).toContain("DTSTART;TZID=America/Toronto:20261024T110000");
  expect(ics).toContain("DTEND;TZID=America/Toronto:20261024T160000");
});
