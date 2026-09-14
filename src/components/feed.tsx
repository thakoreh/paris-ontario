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
  Activity,
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
} from "@/lib/relevance";
import { usePersonal } from "./provider";
import { NoticeCard, DeadlineCard, SectionHeading, EmptyState } from "./cards";
import { MapPanel } from "./map-panel";
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
  const personal = ["app", "feed", "saved", "personal-map"].includes(mode);
  const home = mode === "home";
  const dashboard = ["home", "today", "app"].includes(mode);
  const [limit, setLimit] = useState(12);
  const [expanded, setExpanded] = useState(false);
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
              p.preferences,
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
      if (period === "weekend") {
        const day = new Date(n.start_at || n.published_at).getDay();
        if (day !== 0 && day !== 6) return false;
      }
      return true;
    })
    .sort((a, b) =>
      sort === "newest"
        ? +new Date(b.notice.published_at) - +new Date(a.notice.published_at)
        : sort === "closest"
          ? (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity)
          : 0,
    );
  const important = filtered.filter((m) =>
    ["important", "urgent"].includes(m.notice.severity),
  );
  const title = home
    ? "Know what changed\naround you."
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
    <div className="page-wrap">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot" />
            {home
              ? "LOCAL LIFE. LESS NOISE."
              : new Date()
                  .toLocaleDateString("en-CA", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    timeZone: "America/Toronto",
                  })
                  .toUpperCase()}
            <span className="heading-place">PARIS, ONTARIO</span>
          </div>
          <h1 className={home ? "hero-title" : ""}>{title}</h1>
          <p>
            {home
              ? "Roads, construction, development, recreation, events and important local updates for Paris, Ontario — personalized to where you live."
              : personal
                ? "The changes that matter, around the places you care about."
                : "The updates that matter. The places you know. All in one place."}
          </p>
        </div>
        {!home && (
          <Link href="/app/locations" className="button outline">
            <MapPin size={16} />
            {p.locations[0]?.label || "Personalize my area"}
            <SlidersHorizontal size={14} />
          </Link>
        )}
      </div>
      {home && (
        <div className="hero-actions">
          <Link href="/onboarding" className="button primary">
            Check what changed near me <ArrowRight size={17} />
          </Link>
          <Link href="/today" className="button outline">
            See today in Paris
          </Link>
          <span>
            <ShieldCheck size={15} /> Independent. Source-first. Free to
            explore.
          </span>
        </div>
      )}
      {dashboard && (
        <div className="overview-strip">
          <Link href="/today">
            <span className="stat-icon">
              <Activity size={19} />
            </span>
            <div>
              <strong>{notices.filter((n) => !isExpired(n)).length}</strong>
              <span>local updates</span>
            </div>
            <small>{p.demo ? "Sample feed" : "Published notices"}</small>
          </Link>
          <Link href="/deadlines">
            <span className="stat-icon amber">
              <Bell size={19} />
            </span>
            <div>
              <strong>
                {
                  deadlines.filter(
                    (d) =>
                      +new Date(d.deadline_at) <
                      new Date().getTime() + 7 * 86400000,
                  ).length
                }
              </strong>
              <span>deadlines this week</span>
            </div>
            <small>A little heads-up</small>
          </Link>
          <Link href="/sources">
            <span className="stat-icon blue">
              <ShieldCheck size={19} />
            </span>
            <div>
              <strong>{sources.length}</strong>
              <span>source references</span>
            </div>
            <small>Know where it comes from</small>
          </Link>
        </div>
      )}
      <div className={dashboard ? "content-grid" : "full-content"}>
        <div className="feed-column">
          {dashboard && (
            <>
              <SectionHeading
                title={personal ? "Needs attention" : "Worth knowing today"}
                note={
                  p.demo
                    ? "A preview of important local updates — all sample data."
                    : "Important changes from published sources."
                }
              />
              <div className="attention-grid">
                {important.slice(0, 2).map((m) => (
                  <Link
                    key={m.notice.id}
                    href={`/notice/${m.notice.slug}`}
                    className={`attention-card ${m.notice.category === "emergency" ? "warm" : ""}`}
                  >
                    <div className="attention-top">
                      <span>
                        <CloudLightning size={15} />
                        {m.notice.is_sample
                          ? "SAMPLE DATA"
                          : "IMPORTANT UPDATE"}
                      </span>
                      <ArrowUpRight size={18} />
                    </div>
                    <h3>{m.notice.title}</h3>
                    <p>{m.notice.summary}</p>
                    <div className="attention-bottom">
                      <span>
                        {
                          sources.find((s) => s.id === m.notice.source_id)
                            ?.organization
                        }
                      </span>
                      <span>
                        View update <ArrowRight size={13} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
          <SectionHeading
            title={
              dashboard
                ? personal
                  ? "What changed near Home"
                  : "The latest around you"
                : mode === "saved"
                  ? "Saved for later"
                  : mode === "events"
                    ? "Events & community activities"
                    : "Local updates"
            }
            note={dashboard ? "Less searching. More knowing." : ""}
          />
          <div className="feed-toolbar">
            <div className="search-field">
              <Search size={17} />
              <input
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
            <div className="filter-panel">
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
          {(map || mode === "personal-map") && (
            <div className="large-map">
              <MapPanel
                notices={filtered.slice(0, 100).map((m) => m.notice)}
                locations={personal ? p.locations : undefined}
                radius={personal ? p.preferences.radius_km : 0}
              />
              <div className="map-caption">
                <span className="live-dot" /> Notice locations · select a marker
                for details
              </div>
            </div>
          )}
          <div className="notice-list">
            {filtered.slice(0, dashboard && !expanded ? 6 : limit).map((m) => (
              <NoticeCard
                key={m.notice.id}
                notice={m.notice}
                source={sources.find((s) => s.id === m.notice.source_id)}
                match={personal ? m : undefined}
              />
            ))}
            {!filtered.length && <EmptyState />}
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
                <span>
                  <span className="live-dot" /> Paris & your neighbourhood
                </span>
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
              {deadlines
                .filter(
                  (d) =>
                    !personal ||
                    relevantDeadline(d, p.locations, p.preferences),
                )
                .slice(0, 3)
                .map((d) => (
                  <DeadlineCard key={d.id} deadline={d} />
                ))}
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
            <div className="personalize-card">
              <span className="eyebrow">A LITTLE MORE PERSONAL</span>
              <h3>
                Your street.
                <br />
                Your interests.
                <br />
                Your Pulse.
              </h3>
              <p>
                Save your places and we’ll help you find what matters nearby.
              </p>
              <Link href="/onboarding" className="button primary">
                Make it mine <ArrowUpRight size={15} />
              </Link>
              <small>
                <ShieldCheck size={13} /> Your locations stay private.
              </small>
            </div>
          </aside>
        )}
      </div>
      {home && (
        <section className="how-it-works">
          <SectionHeading title="A simpler way to stay in the know." />
          <div className="three-grid">
            {[
              [
                "01",
                "Save a place",
                "Home, work, school. Start with the places that matter to you.",
              ],
              [
                "02",
                "Choose your interests",
                "Traffic, planning, family activities. Set your radius and priorities.",
              ],
              [
                "03",
                "Get your local Pulse",
                "See what changed, why it matters, and the original source.",
              ],
            ].map(([n, t, d]) => (
              <div key={n}>
                <span>{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
          <Link href="/signup" className="text-link">
            Get your daily email updates <ArrowRight size={16} />
          </Link>
        </section>
      )}
    </div>
  );
}
