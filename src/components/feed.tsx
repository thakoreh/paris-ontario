"use client";
import React, { useEffect, useMemo, useState } from "react";
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
  Plus,
  Sparkles,
} from "lucide-react";
import type { Notice, Deadline, Source, Match } from "@/types";
import { categories, categoryLabels } from "@/types";
import {
  scoreNotice,
  rankMatches,
  severityRank,
  relevantDeadline,
  upcomingDeadlines,
} from "@/lib/relevance";
import { usePersonal } from "./provider";
import { NoticeCard, DeadlineCard, SectionHeading, EmptyState } from "./cards";
import { MapPanel } from "./map-panel";
import { ShareButton } from "./share-button";
import { CoverageStatus } from "./coverage-status";
import {
  isThisWeekend,
  latestVerification,
  localDateKey,
} from "@/lib/resident-briefing";
import {
  groupTodayMatches,
  latestPublicChangeAt,
  noticeKind,
} from "@/lib/resident-experience";
import { formatDate } from "@/lib/utils";
import { defaultPreferences } from "@/config/community";
import "./neighbourhood.css";
import "./neighbourhood-feed.css";

const kinds = [
  ["all", "All updates"],
  ["change", "Roads & services"],
  ["event", "Events"],
  ["business", "Local openings"],
  ["community", "Community"],
] as const;

type EmptyAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

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
  const dashboard = ["home", "today", "app"].includes(mode);
  const nearby = p.locations.length > 0 && p.areaScope === "nearby";
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState(mode === "events" ? "event" : "all");
  const [category, setCategory] = useState("all");
  const [importance, setImportance] = useState("all");
  const [period, setPeriod] = useState("all");
  const [sort, setSort] = useState("relevant");
  const [location, setLocation] = useState("all");
  const defaultStatus = mode === "saved" ? "saved" : "all";
  const [status, setStatus] = useState(defaultStatus);
  const [filters, setFilters] = useState(false);
  const [map, setMap] = useState(["map", "personal-map"].includes(mode));
  const [limit, setLimit] = useState(12);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<string | null>(null);
  const [inviteReady, setInviteReady] = useState(false);
  useEffect(() => setInviteReady(true), []);
  const hasFilters = Boolean(
    query ||
    kind !== (mode === "events" ? "event" : "all") ||
    category !== "all" ||
    importance !== "all" ||
    period !== "all" ||
    sort !== "relevant" ||
    location !== "all" ||
    status !== defaultStatus,
  );
  function clearFilters() {
    setQuery("");
    setKind(mode === "events" ? "event" : "all");
    setCategory("all");
    setImportance("all");
    setPeriod("all");
    setSort("relevant");
    setLocation("all");
    setStatus(defaultStatus);
    setLimit(12);
  }
  const areaLocations = useMemo(
    () =>
      nearby
        ? p.locations.filter(
            (place) => location === "all" || place.id === location,
          )
        : [],
    [nearby, p.locations, location],
  );
  const matches = useMemo(
    () =>
      rankMatches(
        notices
          .map((notice) =>
            scoreNotice(
              notice,
              areaLocations,
              nearby ? p.preferences : defaultPreferences,
              new Date(),
              deadlines,
            ),
          )
          .filter((match): match is Match => Boolean(match)),
        (id) =>
          sources.find((source) => source.id === id)?.authority_level ||
          "community_signal",
      ),
    [notices, areaLocations, nearby, p.preferences, deadlines, sources],
  );
  const filtered = matches
    .filter(({ notice: n }) => {
      if (mode === "events" && n.category !== "event") return false;
      if (kind !== "all" && noticeKind(n) !== kind) return false;
      if (category !== "all" && n.category !== category) return false;
      if (
        importance !== "all" &&
        severityRank[n.severity] <
          severityRank[importance as keyof typeof severityRank]
      )
        return false;
      if (
        query.trim() &&
        !`${n.title} ${n.summary} ${n.address_text || ""} ${n.tags_json.join(" ")} ${categoryLabels[n.category]}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      )
        return false;
      if (status === "saved" && !p.saved.includes(n.id)) return false;
      if (status === "unread" && p.read.includes(n.id)) return false;
      if (p.dismissed.includes(n.id) && mode !== "saved") return false;
      const changed = latestPublicChangeAt(n);
      if (
        period === "today" &&
        (!changed || localDateKey(changed) !== localDateKey(new Date()))
      )
        return false;
      if (
        period === "week" &&
        (!changed || +new Date() - +new Date(changed) > 7 * 86400000)
      )
        return false;
      if (
        ["family", "free", "downtown"].includes(period) &&
        !n.tags_json.includes(period)
      )
        return false;
      if (period === "weekend" && !isThisWeekend(n)) return false;
      return true;
    })
    .sort((a, b) =>
      sort === "newest"
        ? +new Date(latestPublicChangeAt(b.notice) || 0) -
          +new Date(latestPublicChangeAt(a.notice) || 0)
        : sort === "closest"
          ? (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity)
          : 0,
    );
  const groups = groupTodayMatches(filtered, p.lastVisitAt);
  const verifiedAt = latestVerification(matches.map((match) => match.notice));
  const comingDeadlines = upcomingDeadlines(deadlines)
    .filter(
      (deadline) =>
        !nearby || relevantDeadline(deadline, areaLocations, p.preferences),
    )
    .sort((a, b) => +new Date(a.deadline_at) - +new Date(b.deadline_at));
  const mapNotices = filtered.map((match) => match.notice);
  const mappedCount = mapNotices.filter(
    (notice) => notice.latitude !== null && notice.longitude !== null,
  ).length;
  const title = dashboard
    ? "Today in Paris"
    : mode === "events"
      ? "Things to do in Paris"
      : mode === "saved"
        ? "Your saved notices"
        : "Explore your neighbourhood";
  const renderCard = (match: Match) => (
    <NoticeCard
      key={match.notice.id}
      notice={match.notice}
      source={sources.find((source) => source.id === match.notice.source_id)}
      match={nearby ? match : undefined}
    />
  );
  function renderGroup(
    id: "change" | "event" | "business" | "community",
    title: string,
    note: string,
    empty: string,
  ) {
    const items = groups[id];
    if (!items.length && hasFilters) return null;
    const emptyMessage =
      id === "event" && !nearby
        ? "No current events in this view. Check the community calendar in Services."
        : empty;
    const emptyActions: EmptyAction[] =
      id === "event"
        ? [{ label: "Check Services", href: "/services" }]
        : id === "business"
          ? [{ label: "Share a source", href: "/share-update" }]
          : id === "community"
            ? [{ label: "Review sources", href: "/sources" }]
            : [];
    if (!items.length && nearby) {
      emptyActions.push({
        label: "View all Paris",
        onClick: () => p.setAreaScope("all"),
      });
    }
    return (
      <section
        className={`today-section section-${id}`}
        aria-labelledby={`section-${id}`}
      >
        <div className="section-heading">
          <div>
            <h2 id={`section-${id}`}>{title}</h2>
            <p>{note}</p>
          </div>
          <span className="section-count">{items.length}</span>
        </div>
        {items.length ? (
          <div
            className={`today-cards ${id === "event" || id === "business" ? "discovery-cards" : ""}`}
          >
            {items
              .slice(0, expandedGroups.includes(id) ? items.length : 3)
              .map(renderCard)}
          </div>
        ) : (
          <div className="section-empty">
            <p>{emptyMessage}</p>
            {emptyActions.length > 0 && (
              <div className="section-empty-actions">
                {emptyActions.map((action) =>
                  action.href ? (
                    <Link key={action.label} href={action.href}>
                      {action.label}
                    </Link>
                  ) : (
                    <button
                      key={action.label}
                      type="button"
                      onClick={action.onClick}
                    >
                      {action.label}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        )}
        {items.length > 3 && !expandedGroups.includes(id) && (
          <button
            className="section-more"
            onClick={() => setExpandedGroups([...expandedGroups, id])}
          >
            Show all {items.length} updates <ArrowRight size={15} />
          </button>
        )}
      </section>
    );
  }
  return (
    <div
      className={`page-wrap neighbourhood-feed ${dashboard ? "neighbourhood-today" : "neighbourhood-explore"}`}
    >
      <header className="neighbourhood-heading">
        <div>
          <span className="eyebrow">
            PARIS, ONTARIO{" "}
            <span className="heading-place">
              {new Date().toLocaleDateString("en-CA", {
                weekday: "long",
                month: "long",
                day: "numeric",
                timeZone: "America/Toronto",
              })}
            </span>
          </span>
          <h1>{title}</h1>
          <p>
            {dashboard
              ? "A little closer to what’s happening around you."
              : mode === "saved"
                ? "The updates you’ve kept, all in one place."
                : "Find a local change, something to do, or a new place to visit."}
          </p>
        </div>
        <Link href="/share-update" className="button outline">
          <Plus size={17} /> Share a local update
        </Link>
      </header>
      {dashboard && p.ready && !p.locations.length && (
        <div className="welcome-area">
          <div>
            <MapPin size={21} />
            <p>
              <strong>Make this your neighbourhood.</strong> Choose a private
              place and radius to bring nearby updates into focus.
            </p>
          </div>
          <Link className="button primary" href="/app/area">
            Set my area <ArrowRight size={16} />
          </Link>
        </div>
      )}
      <section className="explore-controls" aria-label="Find local updates">
        <div className="feed-toolbar">
          <div className="search-field">
            <Search size={19} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search local updates"
              placeholder="Search a street, place or topic…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setLimit(12);
              }}
            />
          </div>
          <button
            className="button outline"
            aria-expanded={filters}
            aria-controls="notice-filter-panel"
            onClick={() => setFilters(!filters)}
          >
            <SlidersHorizontal size={17} />
            More filters
          </button>
          {!dashboard && (
            <div
              className="view-control"
              role="group"
              aria-label="Explore view"
            >
              <button aria-pressed={!map} onClick={() => setMap(false)}>
                <List size={16} />
                List
              </button>
              <button aria-pressed={map} onClick={() => setMap(true)}>
                <MapIcon size={16} />
                Map
              </button>
            </div>
          )}
        </div>
        {mode !== "events" && (
          <div
            className="filter-tabs"
            role="group"
            aria-label="Category filters"
          >
            {kinds.map(([value, label]) => (
              <button
                key={value}
                aria-pressed={kind === value}
                className={kind === value ? "active" : ""}
                onClick={() => {
                  setKind(value);
                  setCategory("all");
                  setLimit(12);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {filters && (
          <div className="filter-panel" id="notice-filter-panel">
            <label>
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {categoryLabels[value]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date / type
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              >
                <option value="all">Any time</option>
                <option value="today">Published or updated today</option>
                <option value="week">Published or updated this week</option>
                <option value="weekend">Events this weekend</option>
                <option value="family">Family</option>
                <option value="free">Free</option>
                <option value="downtown">Downtown</option>
              </select>
            </label>
            <label>
              Importance
              <select
                value={importance}
                onChange={(event) => setImportance(event.target.value)}
              >
                <option value="all">All importance</option>
                <option value="important">Important & urgent</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label>
              Sort
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="relevant">Relevant</option>
                <option value="newest">Newest</option>
                <option value="closest" disabled={!nearby}>
                  Closest
                </option>
              </select>
            </label>
            {nearby && (
              <label>
                Location
                <select
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                >
                  <option value="all">All saved places</option>
                  {p.locations.map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="all">All notices</option>
                <option value="unread">Unread</option>
                <option value="saved">Saved</option>
              </select>
            </label>
          </div>
        )}
        <div className="feed-results">
          <p
            role="status"
            aria-label="Notice results"
            aria-live="polite"
            aria-atomic="true"
          >
            {dashboard
              ? `${filtered.length} ${filtered.length === 1 ? "update" : "updates"}${nearby ? " in your area" : " across Paris"}`
              : `Showing ${Math.min(filtered.length, limit)} of ${filtered.length} notices`}
          </p>
          {hasFilters && (
            <button className="text-button" onClick={clearFilters}>
              Clear filters
            </button>
          )}
          <Link href="/sources" className="coverage-link">
            <ShieldCheck size={14} />
            {p.demo
              ? "Sample preview · not live information"
              : verifiedAt
                ? `Latest verification ${formatDate(verifiedAt)} ET`
                : "Coverage is still growing"}
          </Link>
        </div>
      </section>
      {dashboard && <CoverageStatus sources={sources} demo={p.demo} />}
      {dashboard ? (
        <div className="neighbourhood-layout">
          <div className="today-main">
            <section
              className="since-visit"
              aria-labelledby="since-visit-title"
            >
              <div className="since-visit-heading">
                <Sparkles size={20} />
                <div>
                  <h2 id="since-visit-title">New since your last visit</h2>
                  <p>
                    {!p.ready
                      ? "Loading your visit history…"
                      : !p.visitHistoryAvailable
                        ? "Visit history is unavailable in this browser. You can still explore every update below."
                        : !p.lastVisitAt
                          ? "Your first look around. On your next visit, newly published and source-updated notices will appear here."
                          : groups.new.length
                            ? `${groups.new.length} verified ${groups.new.length === 1 ? "update" : "updates"} since ${formatDate(p.lastVisitAt)} ET`
                            : "No newly published or source-updated notices in this view since your last visit. Coverage is limited."}
                  </p>
                </div>
                {p.lastVisitAt && (
                  <span className="new-count">{groups.new.length}</span>
                )}
              </div>
              {groups.new.length > 0 && (
                <div className="today-cards">
                  {groups.new
                    .slice(
                      0,
                      expandedGroups.includes("new") ? groups.new.length : 4,
                    )
                    .map(renderCard)}
                </div>
              )}
              {groups.new.length > 4 && !expandedGroups.includes("new") && (
                <button
                  className="section-more"
                  onClick={() => setExpandedGroups([...expandedGroups, "new"])}
                >
                  Show all {groups.new.length} new updates{" "}
                  <ArrowRight size={15} />
                </button>
              )}
            </section>
            {renderGroup(
              "change",
              "Changes around you",
              "Roads, services and the things that affect your day.",
              "No current road or service changes in this view. Check official sources before travelling.",
            )}
            {renderGroup(
              "event",
              "Things to do",
              "Dates and details from the original event announcement.",
              "No current events in this view. Try All Paris or check the community calendar in Services.",
            )}
            {renderGroup(
              "business",
              "Local openings",
              "New places, with a source you can check.",
              "No verified local opening announcements in this view yet. Know of one? Share the source for review.",
            )}
            {renderGroup(
              "community",
              "Around the neighbourhood",
              "Planning, recreation and other useful local news.",
              "No other current community updates in this view.",
            )}
            {!filtered.length && hasFilters && (
              <EmptyState
                title="No matching notices."
                description="Clear your filters or try a different street or topic."
              />
            )}
            <Link className="explore-all" href="/app/feed">
              Explore all local updates <ArrowRight size={17} />
            </Link>
          </div>
          <aside className="neighbourhood-rail">
            <section className="neighbourhood-map-card">
              <SectionHeading
                title="Around your area"
                href="/map"
                label="Open map"
              />
              {mappedCount > 0 ? (
                <>
                  <div className="preview-map">
                    <MapPanel
                      notices={mapNotices}
                      locations={areaLocations}
                      radius={nearby ? p.preferences.radius_km : 0}
                    />
                  </div>
                  <p>
                    {mappedCount}{" "}
                    {mappedCount === 1 ? "update has" : "updates have"} a map
                    location. Your saved places stay private.
                  </p>
                </>
              ) : (
                <div className="map-preview-empty">
                  <p>
                    <strong>No updates have a map location yet.</strong>
                    Explore the list for every matching update.
                  </p>
                  <Link href="/app/feed">Explore the update list</Link>
                </div>
              )}
            </section>
            <section className="neighbourhood-deadlines">
              <SectionHeading
                title="Coming up"
                href="/deadlines"
                label="All deadlines"
              />
              <p className="rail-intro">A heads-up for the next seven days.</p>
              {comingDeadlines.slice(0, 3).map((deadline) => (
                <DeadlineCard key={deadline.id} deadline={deadline} />
              ))}
              {!comingDeadlines.length && (
                <p className="rail-empty">
                  No upcoming deadlines in this view. Check original sources for
                  other due dates.
                </p>
              )}
            </section>
            <section className="neighbourhood-share">
              <span className="rail-symbol">
                <Plus size={22} />
              </span>
              <h2>Know something local?</h2>
              <p>
                Prepare a local update with its original source for review before
                it is published.
              </p>
              <div className="neighbourhood-share-actions">
                <Link href="/share-update" className="button primary">
                  Prepare an update <ArrowRight size={16} />
                </Link>
                <div className="neighbourhood-invite">
                  <span>Invite a neighbour</span>
                  {inviteReady && (
                    <ShareButton
                      base={
                        process.env.NEXT_PUBLIC_APP_URL ||
                        "https://parispulse.ca"
                      }
                      publicPath="/today"
                      title="Paris Pulse — Today in Paris"
                    />
                  )}
                </div>
              </div>
            </section>
            <Link className="neighbourhood-storm" href="/storm">
              <CloudLightning size={22} />
              <div>
                <strong>Weather taking a turn?</strong>
                <span>
                  Official storm & outage tools <ArrowUpRight size={14} />
                </span>
              </div>
            </Link>
            <Link className="rail-settings" href="/notifications">
              Browser alerts · Check this device <ArrowUpRight size={14} />
            </Link>
            {p.profile && ["editor", "admin"].includes(p.profile.role) && (
              <Link className="rail-settings" href="/admin/review">
                Editorial review <ArrowRight size={14} />
              </Link>
            )}
          </aside>
        </div>
      ) : (
        <div className={`explore-results ${map ? "with-map" : ""}`}>
          {map && (
            <section className="explore-map" aria-label="Map view">
              <div className="large-map">
                <MapPanel
                  notices={mapNotices}
                  locations={areaLocations}
                  radius={nearby ? p.preferences.radius_km : 0}
                  selectedNoticeId={selectedNotice}
                  onSelectNotice={setSelectedNotice}
                />
              </div>
              <p className="map-caption">
                {mappedCount} of {filtered.length} updates have a map location.
                All matching updates are in the list.
                {nearby
                  ? " Your saved places and radius are shown only to you."
                  : ""}
              </p>
              <div className="map-legend">
                <span className="legend-change">Roads & services</span>
                <span className="legend-event">Events</span>
                <span className="legend-business">Local openings</span>
                <span className="legend-community">Community</span>
              </div>
            </section>
          )}
          <div>
            <div className="notice-list explore-notice-list">
              {filtered.slice(0, limit).map((match) => (
                <div
                  key={match.notice.id}
                  className={
                    selectedNotice === match.notice.id
                      ? "map-selected-notice"
                      : ""
                  }
                >
                  {map &&
                    match.notice.latitude !== null &&
                    match.notice.longitude !== null && (
                      <button
                        className="show-on-map"
                        onClick={() => setSelectedNotice(match.notice.id)}
                        aria-label={`Show ${match.notice.title} on map`}
                      >
                        <MapPin size={14} />
                        Show on map
                      </button>
                    )}
                  {renderCard(match)}
                </div>
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
                        : "Try All Paris or check original sources for the latest information."
                  }
                />
              )}
            </div>
            {filtered.length > limit && (
              <button
                className="button outline load-more"
                onClick={() => setLimit(limit + 12)}
              >
                Load more updates
              </button>
            )}
          </div>
        </div>
      )}
      {dashboard && (
        <nav
          className="neighbourhood-shortcuts"
          aria-label="Resident essentials"
        >
          <Link href="/services">
            <ShieldCheck size={21} />
            <div>
              <strong>Everyday services</strong>
              <span>Waste, transit, library and more</span>
            </div>
            <ArrowUpRight size={16} />
          </Link>
          <Link href="/deadlines">
            <CalendarDays size={21} />
            <div>
              <strong>Keep a date in mind</strong>
              <span>Deadlines and calendar reminders</span>
            </div>
            <ArrowUpRight size={16} />
          </Link>
          <Link href="/new-to-paris">
            <MapPin size={21} />
            <div>
              <strong>New to Paris?</strong>
              <span>Your practical first-week guide</span>
            </div>
            <ArrowUpRight size={16} />
          </Link>
        </nav>
      )}
    </div>
  );
}
