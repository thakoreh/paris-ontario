"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  Share2,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import type { Notice, Source, Deadline } from "@/types";
import { categoryLabels } from "@/types";
import { formatDate } from "@/lib/utils";
import { scoreNotice, isExpired, relevantDeadline } from "@/lib/relevance";
import { track } from "@/lib/analytics";
import { usePersonal } from "./provider";
import { SampleBadge, DeadlineCard, EmptyState } from "./cards";
import { MapPanel } from "./map-panel";
export function NoticeDetail({
  notice: n,
  source,
}: {
  notice: Notice;
  source?: Source;
}) {
  const p = usePersonal();
  useEffect(() => {
    track("notice_viewed", { notice_id: n.id });
  }, [n.id]);
  const match = scoreNotice(n, p.locations, p.preferences);
  return (
    <div className="page-wrap detail-wrap">
      <Link className="back-link" href="/today">
        <ArrowLeft size={15} /> Back to local updates
      </Link>
      <div className="card-eyebrow">
        <span>{categoryLabels[n.category]}</span>
        {n.is_sample && <SampleBadge />}
        <span>{isExpired(n) ? "Past" : n.severity}</span>
      </div>
      <h1>{n.title}</h1>
      <p className="detail-lead">{n.summary}</p>
      {n.is_sample && (
        <p className="sample-callout">
          <strong>Sample data.</strong> This notice is fictional. Its source
          link is an organization reference, not evidence of a real notice.
        </p>
      )}
      <div className="detail-facts">
        <div>
          <ShieldCheck size={18} />
          <span>
            Source<strong>{source?.organization || "Original source"}</strong>
          </span>
        </div>
        <div>
          <span>
            Published<strong>{formatDate(n.published_at)} ET</strong>
          </span>
        </div>
        <div>
          <span>
            Last verified
            <strong>
              {n.verified_at
                ? formatDate(n.verified_at)
                : "Not verified · sample or pending"}
            </strong>
          </span>
        </div>
      </div>
      <div className="action-row">
        <a
          className="button primary"
          href={n.official_url}
          onClick={() =>
            track("source_clicked", { notice_id: n.id, source_id: n.source_id })
          }
          target="_blank"
          rel="noreferrer"
        >
          Open original source <ArrowUpRight size={16} />
        </a>
        <button
          className="button outline"
          onClick={() =>
            void p.toggleNotice(n.id, "saved").catch((e) => p.notify(e.message))
          }
        >
          <Bookmark size={16} />
          {p.saved.includes(n.id) ? "Saved" : "Save notice"}
        </button>
        <button
          className="button outline"
          onClick={() =>
            void p.toggleNotice(n.id, "read").catch((e) => p.notify(e.message))
          }
        >
          <Check size={16} />
          {p.read.includes(n.id) ? "Mark unread" : "Mark read"}
        </button>
        <button
          className="button outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              p.notify("Link copied.");
            } catch {
              p.notify("Copy this page’s address to share it.");
            }
          }}
        >
          <Share2 size={16} />
          Share
        </button>
      </div>
      <section className="panel">
        <h2>What to know</h2>
        <p>{n.body || n.summary}</p>
        <h3>Affected area</h3>
        <p>
          <MapPin size={16} />{" "}
          {n.affected_area_text || n.address_text || n.city}
        </p>
        {n.start_at && <p>Starts: {formatDate(n.start_at)} ET</p>}
        {n.end_at && <p>Ends: {formatDate(n.end_at)} ET</p>}
        {match && p.locations.length > 0 && (
          <>
            <h3>Why you’re seeing this</h3>
            <ul>
              {match.match_reasons_json.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </>
        )}
      </section>
      {n.latitude !== null ? (
        <div className="large-map">
          <MapPanel notices={[n]} />
        </div>
      ) : (
        <p className="message-box">
          No exact map location is available. This notice uses an area-level
          match.
        </p>
      )}
      <p className="disclaimer">
        Information can change. Verify important details with the original
        source. Paris Pulse is not an official County of Brant service.
      </p>
    </div>
  );
}
export function DeadlinesPage({
  deadlines,
  detail = false,
  personal = false,
}: {
  deadlines: Deadline[];
  detail?: boolean;
  personal?: boolean;
}) {
  const [category, setCategory] = useState("all");
  const [period, setPeriod] = useState("month");
  const p = usePersonal();
  const filtered = deadlines.filter(
    (d) =>
      (detail || +new Date(d.deadline_at) > new Date().getTime()) &&
      (!personal || relevantDeadline(d, p.locations, p.preferences)) &&
      (category === "all" || d.category === category) &&
      (detail ||
        +new Date(d.deadline_at) - new Date().getTime() <
          (period === "today"
            ? 86400000
            : period === "week"
              ? 7 * 86400000
              : 31 * 86400000)),
  );
  return (
    <div className="page-wrap detail-wrap">
      <span className="eyebrow">A LITTLE HEADS-UP</span>
      <h1>{detail ? "Make time for what matters." : "Dates worth keeping."}</h1>
      <p className="page-intro">
        Registration windows, public consultations, and dates worth keeping.
      </p>
      {!detail && (
        <div className="feed-toolbar">
          <select
            aria-label="Deadline period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="week">Next 7 days</option>
            <option value="month">This month</option>
          </select>
          <select
            aria-label="Deadline category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            <option value="recreation">Family & recreation</option>
            <option value="planning">Planning</option>
            <option value="event">Events</option>
          </select>
        </div>
      )}
      {filtered.map((d) => (
        <div className="panel" key={d.id}>
          <DeadlineCard deadline={d} full />
          {detail && d.notice_id && (
            <p>
              <Link className="text-link" href={`/today`}>
                Browse related local updates <ArrowUpRight size={14} />
              </Link>
            </p>
          )}
        </div>
      ))}
      {!filtered.length && (
        <EmptyState title="No upcoming deadlines in this view." />
      )}
      <p className="disclaimer">
        Calendar downloads work locally. Reminders are saved, but scheduled
        email delivery is not enabled yet. Verify important dates with the
        original source.
      </p>
    </div>
  );
}
