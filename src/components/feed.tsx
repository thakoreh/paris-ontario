"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  MapPin,
  ShieldCheck,
  CloudLightning,
  SlidersHorizontal,
  Map as MapIcon,
  List,
  CalendarDays,
  Bell,
} from "lucide-react";
import type { Notice, Deadline, Source } from "@/types";
import { categories, categoryLabels } from "@/types";
import {
  scoreNotice,
  rankMatches,
  isExpired,
  severityRank,
  relevantDeadline,
  upcomingDeadlines,
} from "@/lib/relevance";
import { usePersonal } from "./provider";
import { NoticeCard, DeadlineCard, SectionHeading, EmptyState } from "./cards";
import { MapPanel } from "./map-panel";
import {
  isThisWeekend,
  latestVerification,
  noticeDateLabel,
} from "@/lib/resident-briefing";
import { formatDate } from "@/lib/utils";
import { defaultPreferences } from "@/config/community";
import "./resident-guide.css";
import "./resident-dashboard.css";

const quickFilters = [
  { label: "All updates", category: "all", period: "all" },
  { label: "Today", category: "all", period: "today" },
  { label: "This week", category: "all", period: "week" },
  { label: "Events", category: "event", period: "all" },
] as const;
export function Feed({
  notices,
  deadlines,
  sources,
  mode = "today",
}: {
  notices: Notice[];
  deadlines: Deadline[];
  sources: Source[];
  mode?: string;
}) {
  const p = usePersonal();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [importance, setImportance] = useState("all");
  const [period, setPeriod] = useState("all");
  const [sort, setSort] = useState("relevant");
  const [location, setLocation] = useState("all");
  const [status, setStatus] = useState(mode === "saved" ? "saved" : "all");
  const [filters, setFilters] = useState(false);
  const [map, setMap] = useState(mode === "map");
  const home = mode === "home";
  const personal =
    ["app", "feed", "saved", "personal-map"].includes(mode) ||
    (home && p.locations.length > 0);
  const hasArea = personal && p.locations.length > 0;
  const dashboard = ["home", "today", "app"].includes(mode);
  const [limit, setLimit] = useState(12);
  const [expanded, setExpanded] = useState(false);
  const defaultStatus = mode === "saved" ? "saved" : "all";
  const hasFilters = Boolean(
    query ||
    category !== "all" ||
    importance !== "all" ||
    period !== "all" ||
    sort !== "relevant" ||
    location !== "all" ||
    status !== defaultStatus,
  );
  function clearFilters() {
    setQuery("");
    setCategory("all");
    setImportance("all");
    setPeriod("all");
    setSort("relevant");
    setLocation("all");
    setStatus(defaultStatus);
    setLimit(12);
  }
  const matches = useMemo(
    () =>
      rankMatches(
        notices
          .map((n) =>
            scoreNotice(
              n,
              personal
                ? p.locations.filter(
                    (l) => location === "all" || l.id === location,
                  )
                : [],
              personal ? p.preferences : defaultPreferences,
              new Date(),
              deadlines,
            ),
          )
          .filter((m): m is NonNullable<typeof m> => !!m),
        (id) =>
          sources.find((s) => s.id === id)?.authority_level ||
          "community_signal",
      ),
    [
      notices,
      personal,
      p.locations,
      p.preferences,
      location,
      sources,
      deadlines,
    ],
  );
  const filtered = matches
    .filter((m) => {
      const n = m.notice;
      if (isExpired(n)) return false;
      if (mode === "events" && n.category !== "event") return false;
      if (category !== "all" && n.category !== category) return false;
      if (
        importance !== "all" &&
        severityRank[n.severity] <
          severityRank[importance as keyof typeof severityRank]
      )
        return false;
      if (
        query &&
        !`${n.title} ${n.summary} ${n.address_text} ${n.tags_json.join(" ")} ${categoryLabels[n.category]}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return false;
      if (status === "saved" && !p.saved.includes(n.id)) return false;
      if (status === "unread" && p.read.includes(n.id)) return false;
      if (personal && p.dismissed.includes(n.id)) return false;
      const now = new Date().getTime();
      if (period === "today" && now - +new Date(n.published_at) > 86400000)
        return false;
      if (period === "week" && now - +new Date(n.published_at) > 7 * 86400000)
        return false;
      if (period === "family" && !n.tags_json.includes("family")) return false;
      if (period === "free" && !n.tags_json.includes("free")) return false;
      if (period === "downtown" && !n.tags_json.includes("downtown"))
        return false;
      if (period === "weekend" && !isThisWeekend(n)) return false;
      return true;
    })
    .sort((a, b) =>
      sort === "newest"
        ? +new Date(b.notice.published_at) - +new Date(a.notice.published_at)
        : sort === "closest"
          ? (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity)
          : 0,
    );
  const briefingMatches = matches.filter(
    (m) => !personal || !p.dismissed.includes(m.notice.id),
  );
  const lead = briefingMatches[0];
  const weekend = briefingMatches.find((m) => isThisWeekend(m.notice));
  const disruption = briefingMatches.find((m) =>
    [
      "roads",
      "construction",
      "storm",
      "outage",
      "emergency",
      "transit",
    ].includes(m.notice.category),
  );
  const verifiedAt = latestVerification(briefingMatches.map((m) => m.notice));
  const comingDeadlines = upcomingDeadlines(deadlines)
    .filter((d) => !personal || relevantDeadline(d, p.locations, p.preferences))
    .sort((a, b) => +new Date(a.deadline_at) - +new Date(b.deadline_at));
  const areaLabel =
    p.locations.length === 1 ? p.locations[0].label : "your saved places";
  const title = home
    ? hasArea
      ? "Your neighbourhood, in focus."
      : "Closer to what matters."
    : mode === "app"
      ? "Your neighbourhood, in focus."
      : mode === "events"
        ? "A little closer to your community."
        : mode === "saved"
          ? "Your saved notices."
          : mode === "map" || mode === "personal-map"
            ? "What’s happening nearby."
            : mode === "feed"
              ? "Your local feed."
              : "Today in Paris";
  return (
    <div
      className={`page-wrap resident-feed ${dashboard ? "resident-dashboard" : ""}`}
    >
      <div className="page-heading resident-heading">
        <div>
          <div className="eyebrow">
            <span>PARIS, ONTARIO</span>
            <span className="heading-place">
              {new Date().toLocaleDateString("en-CA", {
                weekday: "long",
                month: "long",
                day: "numeric",
                timeZone: "America/Toronto",
              })}
            </span>
          </div>
          <h1 className={dashboard ? "hero-title" : ""}>{title}</h1>
          <p>
            {hasArea
              ? "Local changes, ranked around your places and interests."
              : "Road changes, useful updates and things to do. Start with Paris, then make it yours."}
          </p>
        </div>
        <Link
          href={hasArea ? "/app/locations" : "/onboarding"}
          className="button primary"
        >
          <MapPin size={17} /> {hasArea ? "Manage my area" : "Set my area"}
          <ArrowRight size={16} />
        </Link>
      </div>
      {dashboard && (
        <>
          <div className="area-summary" aria-label="Your feed area">
            <div>
              <MapPin size={17} />
              <strong>
                {hasArea ? `Near ${areaLabel}` : "Exploring all Paris"}
              </strong>
              <span>
                {hasArea
                  ? p.preferences.radius_km === 0
                    ? "All Paris"
                    : `${p.preferences.radius_km} km radius`
                  : "No address needed to browse"}
              </span>
              {hasArea && (
                <Link href="/app/alerts">
                  {p.preferences.categories_json.length} interests · Edit
                </Link>
              )}
            </div>
            <Link href="/notifications">
              <BellIcon /> Browser alerts · Check this device{" "}
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <section
            className="resident-briefing"
            aria-labelledby="briefing-title"
          >
            <div className="briefing-heading">
              <h2 id="briefing-title">
                {hasArea
                  ? "Your local briefing"
                  : mode === "today"
                    ? "The local briefing"
                    : "Today in Paris"}
              </h2>
              <p>
                {p.demo
                  ? "Sample preview · not live local information"
                  : verifiedAt
                    ? `Latest notice verified ${formatDate(verifiedAt)} ET`
                    : "No verification time available for this feed"}
              </p>
            </div>
            <div className="briefing-grid">
              <div className="briefing-lead">
                {lead ? (
                  <NoticeCard
                    notice={lead.notice}
                    source={sources.find((s) => s.id === lead.notice.source_id)}
                    match={hasArea ? lead : undefined}
                  />
                ) : (
                  <div className="briefing-empty">
                    <h3>No current notices in this feed</h3>
                    <p>
                      Coverage is limited. Check original sources for the latest
                      information.
                    </p>
                    <Link className="text-link" href="/sources">
                      Browse sources <ArrowRight size={14} />
                    </Link>
                  </div>
                )}
              </div>
              <div className="briefing-side">
                <BriefingItem
                  title="This weekend"
                  notice={weekend?.notice}
                  href="/events"
                  empty="No dated events for this weekend in this feed."
                />
                <BriefingItem
                  title="Roads & disruptions"
                  notice={disruption?.notice}
                  href="/storm"
                  empty="No current disruption notices in this feed. Check official live tools before travelling."
                />
              </div>
            </div>
          </section>
        </>
      )}
      {dashboard && (
        <section className="discovery-panel" aria-labelledby="discovery-title">
          <div className="discovery-intro">
            <div>
              <span className="eyebrow">FIND SOMETHING LOCAL</span>
              <h2 id="discovery-title">What do you need today?</h2>
            </div>
            <p>
              Search updates, streets or topics, then narrow the list in one
              tap.
            </p>
          </div>
          <div className="feed-toolbar discovery-toolbar">
            <div className="search-field">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                aria-label="Search local updates"
                placeholder="Search updates, streets or topics…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(12);
                }}
              />
            </div>
            <button
              className={`button outline small ${filters ? "selected" : ""}`}
              aria-expanded={filters}
              aria-controls="notice-filter-panel"
              onClick={() => setFilters(!filters)}
            >
              <SlidersHorizontal size={15} />
              More filters
            </button>
            <button
              className="icon-button view-switch"
              aria-label={map ? "Show list" : "Show map"}
              onClick={() => setMap(!map)}
            >
              {map ? <List size={18} /> : <MapIcon size={18} />}
            </button>
          </div>
          <div
            className="quick-filter-row"
            role="group"
            aria-label="Quick filters"
          >
            {quickFilters.map((filter) => {
              const selected =
                category === filter.category && period === filter.period;
              return (
                <button
                  key={filter.label}
                  type="button"
                  className={selected ? "active" : ""}
                  aria-pressed={selected}
                  onClick={() => {
                    setCategory(filter.category);
                    setPeriod(filter.period);
                    setLimit(12);
                  }}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </section>
      )}
      <div className={dashboard ? "content-grid" : "full-content"}>
        <div className="feed-column">
          <SectionHeading
            title={
              dashboard
                ? personal
                  ? hasArea
                    ? `Updates near ${areaLabel}`
                    : "Updates across Paris"
                  : "The latest around you"
                : mode === "saved"
                  ? "Saved for later"
                  : mode === "events"
                    ? "Events & community activities"
                    : "Local updates"
            }
            note={dashboard ? "Less searching. More knowing." : ""}
          />
          {!dashboard && (
            <div className="feed-toolbar">
              <div className="search-field">
                <Search size={17} />
                <input
                  type="search"
                  aria-label="Search notices"
                  placeholder="Search a street, topic or update…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setLimit(12);
                  }}
                />
              </div>
              <button
                className={`button outline small ${filters ? "selected" : ""}`}
                aria-expanded={filters}
                aria-controls="notice-filter-panel"
                onClick={() => setFilters(!filters)}
              >
                <SlidersHorizontal size={15} />
                Filters
              </button>
              <button
                className="icon-button view-switch"
                aria-label={map ? "Show list" : "Show map"}
                onClick={() => setMap(!map)}
              >
                {map ? <List size={18} /> : <MapIcon size={18} />}
              </button>
            </div>
          )}
          <div
            className="filter-tabs"
            role="group"
            aria-label="Category filters"
          >
            {(["all", "roads", "planning", "recreation", "event"] as const).map(
              (c) => (
                <button
                  key={c}
                  className={category === c ? "active" : ""}
                  aria-pressed={category === c}
                  onClick={() => {
                    setCategory(c);
                    setLimit(12);
                  }}
                >
                  {c === "all"
                    ? "All updates"
                    : c === "roads"
                      ? "Roads & traffic"
                      : c === "planning"
                        ? "Planning"
                        : c === "recreation"
                          ? "Family & recreation"
                          : "Events"}
                </button>
              ),
            )}
          </div>
          {filters && (
            <div className="filter-panel" id="notice-filter-panel">
              <label>
                Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {categoryLabels[c]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date / type
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option value="all">Any time</option>
                  <option value="today">Today</option>
                  <option value="week">This week</option>
                  {mode === "events" && (
                    <>
                      <option value="weekend">Weekend</option>
                      <option value="family">Family</option>
                      <option value="free">Free</option>
                      <option value="downtown">Downtown</option>
                    </>
                  )}
                </select>
              </label>
              <label>
                Importance
                <select
                  value={importance}
                  onChange={(e) => setImportance(e.target.value)}
                >
                  <option value="all">All importance</option>
                  <option value="important">Important & urgent</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label>
                Sort
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="relevant">Relevant</option>
                  <option value="newest">Newest</option>
                  <option value="closest">Closest</option>
                </select>
              </label>
              {personal && (
                <>
                  <label>
                    Location
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    >
                      <option value="all">All locations</option>
                      {p.locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Status
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="all">All notices</option>
                      <option value="unread">Unread</option>
                      <option value="saved">Saved</option>
                    </select>
                  </label>
                </>
              )}
            </div>
          )}
          <div className="feed-results">
            <p
              role="status"
              aria-label="Notice results"
              aria-live="polite"
              aria-atomic="true"
            >
              Showing{" "}
              {Math.min(filtered.length, dashboard && !expanded ? 6 : limit)} of{" "}
              {filtered.length} notices
            </p>
            {hasFilters && (
              <button
                type="button"
                className="button outline small"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
          {(map || mode === "personal-map") && (
            <div className="large-map">
              <MapPanel
                notices={filtered.slice(0, 100).map((m) => m.notice)}
                locations={personal ? p.locations : undefined}
                radius={personal ? p.preferences.radius_km : 0}
              />
              <div className="map-caption">
                Notice locations · select a marker for details
              </div>
            </div>
          )}
          <div className="notice-list">
            {filtered.slice(0, dashboard && !expanded ? 6 : limit).map((m) => (
              <NoticeCard
                key={m.notice.id}
                notice={m.notice}
                source={sources.find((s) => s.id === m.notice.source_id)}
                match={hasArea ? m : undefined}
              />
            ))}
            {!filtered.length && (
              <EmptyState
                title={
                  hasFilters
                    ? "No matching notices."
                    : mode === "saved"
                      ? "No saved notices yet."
                      : "No current notices in this feed."
                }
                description={
                  hasFilters
                    ? "Clear your filters or try a different street or topic."
                    : mode === "saved"
                      ? "Use the bookmark button on a notice to keep it here for later."
                      : "There are no current notices to show. Check the original sources for the latest information."
                }
              />
            )}
          </div>
          {dashboard && !expanded ? (
            <button onClick={() => setExpanded(true)} className="feed-more">
              Explore the full feed <ArrowRight size={16} />
            </button>
          ) : (
            filtered.length > limit && (
              <button
                className="button outline load-more"
                onClick={() => setLimit(limit + 12)}
              >
                Load more updates
              </button>
            )
          )}
        </div>
        {dashboard && (
          <aside className="right-rail">
            <section className="map-card">
              <SectionHeading title="Around the corner" href="/map" label="" />
              <div className="preview-map">
                <MapPanel
                  notices={filtered.slice(0, 20).map((m) => m.notice)}
                />
              </div>
              <div className="map-card-bottom">
                <span>Paris & your neighbourhood</span>
                <Link href="/map">
                  Open map <ArrowUpRight size={14} />
                </Link>
              </div>
            </section>
            <section className="rail-deadlines">
              <SectionHeading
                title="Deadlines coming up"
                href="/deadlines"
                label="All"
              />
              <p className="muted small-text">
                A heads-up, before it’s too late.
              </p>
              {comingDeadlines.slice(0, 3).map((d) => (
                <DeadlineCard key={d.id} deadline={d} />
              ))}
              {!comingDeadlines.length && (
                <p className="rail-empty">
                  No upcoming deadlines in the next 7 days in this feed. Check
                  original sources for other due dates.
                </p>
              )}
            </section>
            <Link className="storm-link" href="/storm">
              <CloudLightning size={23} />
              <div>
                <strong>When the weather changes.</strong>
                <p>Official storm, road & outage resources, together.</p>
                <span>
                  Storm & disruption hub <ArrowRight size={14} />
                </span>
              </div>
            </Link>
            <section className="setup-note">
              <ShieldCheck size={20} />
              <h3>Your area, your choice</h3>
              <p>
                {p.guest
                  ? "Browse and save places without an account. Guest choices stay in this browser and aren’t automatically copied when you sign in."
                  : "Your saved places help rank this feed. Review your area and interests in settings; browser alerts need a separate opt-in on each device."}
              </p>
              <Link className="text-link" href="/app/settings">
                Your settings <ArrowRight size={14} />
              </Link>
              {p.profile && ["editor", "admin"].includes(p.profile.role) && (
                <Link className="text-link" href="/admin/review">
                  Editorial review <ArrowRight size={14} />
                </Link>
              )}
            </section>
          </aside>
        )}
      </div>
      {dashboard && (
        <nav className="resident-shortcuts" aria-label="Resident essentials">
          <Link href="/services">
            <ShieldCheck size={20} />
            <span className="shortcut-copy">
              <strong>Find a service</strong>
              <small>Waste, transit, library and more</small>
            </span>
            <ArrowUpRight size={16} />
          </Link>
          <Link href="/deadlines">
            <CalendarDays size={20} />
            <span className="shortcut-copy">
              <strong>Check upcoming deadlines</strong>
              <small>Keep due dates in view</small>
            </span>
            <ArrowUpRight size={16} />
          </Link>
          <Link href="/new-to-paris">
            <MapPin size={20} />
            <span className="shortcut-copy">
              <strong>New to Paris? Start here</strong>
              <small>A practical first-week checklist</small>
            </span>
            <ArrowUpRight size={16} />
          </Link>
        </nav>
      )}
    </div>
  );
}

function BellIcon() {
  return <Bell size={15} aria-hidden="true" />;
}

function BriefingItem({
  title,
  notice,
  href,
  empty,
}: {
  title: string;
  notice?: Notice;
  href: string;
  empty: string;
}) {
  return (
    <section className="briefing-item">
      <div>
        <h3>{title}</h3>
        <Link href={href} aria-label={`View ${title}`}>
          <ArrowUpRight size={18} />
        </Link>
      </div>
      {notice ? (
        <>
          <Link className="briefing-title" href={`/notice/${notice.slug}`}>
            {notice.title}
          </Link>
          <p>
            {noticeDateLabel(notice)}
            {notice.is_sample ? " · Sample data" : ""}
          </p>
          <small>
            {notice.address_text ||
              notice.affected_area_text ||
              "Paris, Ontario"}
          </small>
        </>
      ) : (
        <p>{empty}</p>
      )}
    </section>
  );
}
