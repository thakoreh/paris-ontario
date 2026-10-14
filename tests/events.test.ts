import { describe, expect, it, vi } from "vitest";
import { createSeed } from "@/data/seed";
import { eventDay, eventFilterUrl, filterEvents, parseEventFilters } from "@/lib/events";
import { calendarEvent } from "@/lib/calendar";
import { EventStructuredData } from "@/components/structured-data";
const now = new Date("2026-10-14T16:00:00Z");
const event = { ...createSeed(now).notices[0], id: "event-test", category: "event" as const, is_sample: false, verification_status: "verified" as const, published_at: "2026-10-13T12:00:00Z", verified_at: "2026-10-14T12:00:00Z", start_at: "2026-10-17T14:00:00Z", end_at: "2026-10-17T16:00:00Z", expires_at: null, official_url: "https://www.parisfairgrounds.com/events", tags_json: ["free", "family"], address_text: "Test venue" };
describe("event filters", () => {
  it("defaults and ignores invalid or duplicate filters", () => {
    expect(parseEventFilters(new URLSearchParams())).toEqual({ when: "weekend", tags: [] });
    expect(parseEventFilters(new URLSearchParams("when=invalid&tag=free&tag=free&tag=invalid"))).toEqual({ when: "weekend", tags: ["free"] });
  });
  it("serializes multiple tags, preserves unrelated state and restores on load/back", () => {
    const url = eventFilterUrl("/events", new URLSearchParams("q=music&tag=arts"), { when: "week", tags: ["free", "family"] });
    expect(url).toBe("/events?q=music&when=week&tag=family&tag=free");
    expect(parseEventFilters(new URLSearchParams(url.split("?")[1]))).toEqual({ when: "week", tags: ["family", "free"] });
    expect(parseEventFilters(new URLSearchParams("when=today&tag=arts"))).toEqual({ when: "today", tags: ["arts"] });
  });
  it("uses Toronto days and weekend boundaries including Sunday", () => {
    expect(eventDay("2026-10-17T02:00:00Z")).toBe("2026-10-16");
    expect(filterEvents([event], { when: "weekend", tags: ["free", "family"] }, now)).toHaveLength(1);
    expect(filterEvents([event], { when: "today", tags: [] }, now)).toHaveLength(0);
    expect(filterEvents([event], { when: "weekend", tags: ["arts"] }, now)).toHaveLength(0);
    expect(filterEvents([{ ...event, end_at: "2026-10-18T20:00:00Z" }], { when: "weekend", tags: [] }, new Date("2026-10-18T16:00:00Z"))).toHaveLength(1);
  });
  it("excludes sample, unverified, undated and expired events", () => {
    for (const change of [{ is_sample: true }, { verified_at: null }, { start_at: null }, { verification_status: "draft" as const }, { end_at: "2026-10-13T12:00:00Z" }]) expect(filterEvents([{ ...event, ...change }], { when: "month", tags: [] }, now)).toEqual([]);
  });
});
describe("event calendars", () => {
  it("exports CRLF, UTC dates, escaped content, location and UTF-8 line folding", () => {
    const ics = calendarEvent({ ...event, title: "Music, art; fun\n" + "é".repeat(100) });
    expect(ics).toContain("BEGIN:VCALENDAR\r\nVERSION:2.0");
    expect(ics).toContain("DTSTART;TZID=America/Toronto:20261017T100000\r\nDTEND;TZID=America/Toronto:20261017T120000");
    expect(ics).toContain("SUMMARY:Music\\, art\\; fun\\n");
    expect(ics).toContain("LOCATION:Test venue\r\n");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });
  it("emits real Event JSON-LD and escapes script markup", () => {
    const element = EventStructuredData({ notice: { ...event, title: "</script>" } });
    expect(element?.props.dangerouslySetInnerHTML.__html).toContain('"@type":"Event"');
    expect(element?.props.dangerouslySetInnerHTML.__html).not.toContain("</script>");
    expect(EventStructuredData({ notice: { ...event, is_sample: true } })).toBeNull();
  });
});
vi.mock("@/lib/repository", () => ({ deadlineById: vi.fn(), eventById: vi.fn() }));
it("downloads event .ics through the existing route and returns 404 for missing items", async () => {
  const { deadlineById, eventById } = await import("@/lib/repository");
  const { GET } = await import("@/app/api/calendar/[id]/route");
  vi.mocked(deadlineById).mockResolvedValue(null);
  vi.mocked(eventById).mockResolvedValue(event);
  const response = await GET(new Request("https://example.test/api/calendar/event-test"), { params: Promise.resolve({ id: event.id }) });
  expect(response.headers.get("Content-Type")).toContain("text/calendar");
  expect(response.headers.get("Content-Disposition")).toContain(".ics");
  expect(await response.text()).toContain("BEGIN:VEVENT");
  vi.mocked(eventById).mockResolvedValue(null);
  expect((await GET(new Request("https://example.test"), { params: Promise.resolve({ id: "missing" }) })).status).toBe(404);
});
