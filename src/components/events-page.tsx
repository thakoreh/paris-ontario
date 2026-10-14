"use client";
import Link from "next/link";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Notice, Source } from "@/types";
import { eventDay, eventFilterUrl, eventPeriods, eventTags, filterEvents, parseEventFilters, realEvents, type EventFilters } from "@/lib/events";
import { eventsFallback, officialEventCalendars } from "@/data/events-fallback";
import { EventStructuredData } from "./structured-data";
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", dateStyle: "long" }).format(new Date(value));
const timeLabel = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", timeStyle: "short" }).format(new Date(value));
export function EventsPage({ notices, sources, unavailable, now }: { notices: Notice[]; sources: Source[]; unavailable: boolean; now: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const filters = parseEventFilters(new URLSearchParams(params.toString()));
  const update = (next: EventFilters) => router.replace(eventFilterUrl(path, new URLSearchParams(params.toString()), next), { scroll: false });
  const query = params.get("q") || "";
  const items = filterEvents(notices, filters, new Date(now)).filter(n => `${n.title} ${n.summary} ${n.address_text || ""}`.toLowerCase().includes(query.toLowerCase().trim()));
  const groups = new Map<string, Notice[]>();
  items.forEach(n => { const day = eventDay(n.start_at!); groups.set(day, [...(groups.get(day) || []), n]); });
  return <div className="page-wrap events-page">
    <h1>What&apos;s on</h1>
    <form className="event-search" action={path} onSubmit={e => { e.preventDefault(); const next = new URLSearchParams(params.toString()); const value = String(new FormData(e.currentTarget).get("q") || "").trim(); if (value) next.set("q", value); else next.delete("q"); router.replace(eventFilterUrl(path, next, filters), { scroll: false }); }}>
      <label htmlFor="event-search">Search events</label><input key={query} id="event-search" name="q" type="search" defaultValue={query} /><button className="button" type="submit" aria-label="Search events"><Search size={20} /></button>
    </form>
    <div className="event-chips" role="group" aria-label="When">
      {Object.entries(eventPeriods).map(([when, label]) => <button key={when} aria-pressed={filters.when === when} onClick={() => update({ ...filters, when: when as EventFilters["when"] })}>{label}</button>)}
    </div>
    <div className="event-chips" role="group" aria-label="Event tags">
      {eventTags.map(tag => <button key={tag} aria-pressed={filters.tags.includes(tag)} onClick={() => update({ ...filters, tags: filters.tags.includes(tag) ? filters.tags.filter(t => t !== tag) : [...filters.tags, tag] })}>{tag[0].toUpperCase() + tag.slice(1)}</button>)}
    </div>
    {unavailable && <p>Event listings are temporarily unavailable. Browse the official calendars below.</p>}
    {items.length === 0 && <div className="panel"><h2>{filters.when === "weekend" ? "Nothing listed for this weekend yet" : filters.when === "today" ? "Nothing listed for today yet" : `Nothing listed for the next ${filters.when === "week" ? "7" : "30"} days yet`}</h2><button className="button" onClick={() => { const next = new URLSearchParams(params.toString()); next.delete("q"); router.replace(eventFilterUrl(path, next, { when: "month", tags: [] }), { scroll: false }); }}>Next 30 days</button></div>}
    {Array.from(groups, ([day, events]) => <section key={day}><h2 className="event-date">{dateLabel(`${day}T12:00:00Z`)}</h2>{events.map(n => <article className="panel event-card" key={n.id}>
      <h3><Link href={`/notice/${n.slug}`}>{n.title}</Link></h3>
      <p><time dateTime={n.start_at!}>{timeLabel(n.start_at!)} ET</time> · {n.address_text || "Venue: see source"} · {n.tags_json.includes("free") ? "Free" : "Price: see source"}</p>
      <p className="muted"><a href={n.official_url}>{sources.find(s => s.id === n.source_id)?.name || "Official source"}</a> · checked {dateLabel(n.verified_at!)}</p>
      <div className="event-actions"><a className="button" href={`/api/calendar/${encodeURIComponent(n.id)}`}>+ Calendar</a>{n.latitude !== null && n.longitude !== null ? <a className="button" href={`https://www.google.com/maps/search/?api=1&query=${n.latitude},${n.longitude}`}>Map</a> : n.address_text ? <a className="button" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(n.address_text)}`}>Map</a> : <a className="button" href={n.official_url}>Map via source</a>}<a className="button" href={n.official_url}>Source ↗</a></div>
      <EventStructuredData notice={n} />
    </article>)}</section>)}
    {realEvents(notices, new Date(now)).length === 0 && <section><h2>Always in Paris</h2>{eventsFallback.map(entry => <article className="panel" key={entry.title}><h3><a href={entry.source_url}>{entry.title}</a></h3><p>{entry.description}</p><p><a href={entry.source_url}>Source ↗</a> · reviewed {entry.reviewed_at}</p></article>)}</section>}
    <section><h2>Official calendars</h2>{officialEventCalendars.map(entry => <article className="panel" key={entry.title}><h3><a href={entry.source_url}>{entry.title}</a></h3><p>{entry.description}</p><p><a href={entry.source_url}>Source ↗</a> · reviewed {entry.reviewed_at}</p></article>)}</section>
    <Link className="button" href="/share-update">Know an event? Share it</Link>
  </div>;
}
