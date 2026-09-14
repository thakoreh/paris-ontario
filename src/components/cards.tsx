"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  Clock,
  MapPin,
  ShieldCheck,
  Construction,
  Landmark,
  TreePine,
  CalendarDays,
  Bus,
  CloudLightning,
  Info,
  Bell,
  Download,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Notice, Deadline, Match, Source } from "@/types";
import { categoryLabels } from "@/types";
import { formatDate } from "@/lib/utils";
import { calendarEvent, countdown } from "@/lib/calendar";
import { usePersonal } from "./provider";
const categoryIcons = {
  roads: Construction,
  construction: Construction,
  downtown: Construction,
  planning: Landmark,
  recreation: TreePine,
  facility: TreePine,
  event: CalendarDays,
  transit: Bus,
  storm: CloudLightning,
  outage: CloudLightning,
  emergency: CloudLightning,
  public_notice: Info,
  waste: Info,
  other: Info,
};
export function SampleBadge() {
  return <span className="sample-badge">Sample data</span>;
}
export function NoticeCard({
  notice: n,
  source,
  match,
  compact = false,
}: {
  notice: Notice;
  source?: Source;
  match?: Match;
  compact?: boolean;
}) {
  const p = usePersonal();
  const Icon = categoryIcons[n.category];
  return (
    <article
      className={`notice-card ${compact ? "compact" : ""} ${p.read.includes(n.id) ? "is-read" : ""}`}
    >
      <div className={`category-icon cat-${n.category}`}>
        <Icon size={21} />
      </div>
      <div className="notice-main">
        <div className="card-eyebrow">
          <span>{categoryLabels[n.category]}</span>
          <span>·</span>
          <span>{formatDate(n.published_at).split(",")[0]}</span>
          {n.is_sample && <SampleBadge />}
        </div>
        <Link href={`/notice/${n.slug}`} className="notice-title">
          {n.title}
        </Link>
        {!compact && <p className="notice-summary">{n.summary}</p>}
        <div className="notice-meta">
          <span>
            <MapPin size={13} />
            {match?.match_reasons_json[0] || n.address_text || "All Paris"}
          </span>
          {n.severity === "important" && (
            <span className="importance">Important</span>
          )}
          {n.severity === "urgent" && (
            <span className="urgency">
              {n.is_sample ? "Urgent example" : "Urgent"}
            </span>
          )}
        </div>
        {!compact && (
          <div className="card-source">
            <span>
              <ShieldCheck size={13} />
              {source?.organization || "Original source"}
            </span>
            <span>
              {n.is_sample
                ? "Demo · not verified"
                : n.verified_at
                  ? `Verified ${formatDate(n.verified_at)}`
                  : "Verification pending"}
            </span>
          </div>
        )}
        {match && !compact && (
          <details className="reasons">
            <summary>Why you’re seeing this</summary>
            <ul>
              {match.match_reasons_json.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <button
        className={`icon-button bookmark ${p.saved.includes(n.id) ? "selected" : ""}`}
        aria-label={
          p.saved.includes(n.id) ? `Unsave ${n.title}` : `Save ${n.title}`
        }
        onClick={() =>
          void p.toggleNotice(n.id, "saved").catch((e) => p.notify(e.message))
        }
      >
        <Bookmark
          size={18}
          fill={p.saved.includes(n.id) ? "currentColor" : "none"}
        />
      </button>
    </article>
  );
}
export function DeadlineCountdown({ date }: { date: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="countdown">
      <Clock size={12} />
      {now ? countdown(date, now) : "Upcoming"}
    </span>
  );
}
export function downloadCalendar(d: Deadline) {
  const url = URL.createObjectURL(
    new Blob([calendarEvent(d)], { type: "text/calendar;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `paris-pulse-${d.id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
export function DeadlineCard({
  deadline: d,
  full = false,
}: {
  deadline: Deadline;
  full?: boolean;
}) {
  const p = usePersonal();
  const date = new Date(d.deadline_at);
  return (
    <article className="deadline-card">
      <div className="deadline-date">
        <span>
          {date.toLocaleDateString("en-CA", {
            month: "short",
            timeZone: "America/Toronto",
          })}
        </span>
        <strong>
          {date.toLocaleDateString("en-CA", {
            day: "numeric",
            timeZone: "America/Toronto",
          })}
        </strong>
      </div>
      <div className="deadline-main">
        <div className="card-eyebrow">
          <span>{categoryLabels[d.category]}</span>
          {d.is_sample && <SampleBadge />}
        </div>
        <Link href={`/deadline/${d.id}`} className="deadline-title">
          {d.title}
        </Link>
        <div className="deadline-meta">
          <span>{formatDate(d.deadline_at)} ET</span>
          <DeadlineCountdown date={d.deadline_at} />
        </div>
        {full && (
          <>
            <p>{d.description}</p>
            <div className="action-row">
              <button
                className="button outline small"
                onClick={() => downloadCalendar(d)}
              >
                <Download size={15} /> Add to calendar
              </button>
              <select
                aria-label={`Reminder for ${d.title}`}
                defaultValue="1440"
                id={`reminder-${d.id}`}
              >
                <option value="1440">1 day before</option>
                <option value="60">1 hour before</option>
                <option value="0">At deadline</option>
              </select>
              <button
                className="button outline small"
                onClick={() =>
                  void p
                    .remind({
                      deadline_id: d.id,
                      minutes_before: Number(
                        (
                          document.getElementById(
                            `reminder-${d.id}`,
                          ) as HTMLSelectElement
                        ).value,
                      ),
                    })
                    .catch((e) => p.notify(e.message))
                }
              >
                <Bell size={15} />
                {p.reminders.some((r) => r.deadline_id === d.id)
                  ? "Update reminder"
                  : "Remind me"}
              </button>
              <a
                href={d.official_url}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                Original source <ArrowUpRight size={14} />
              </a>
            </div>
          </>
        )}
      </div>
      {!full && (
        <Link
          aria-label={`View ${d.title}`}
          href={`/deadline/${d.id}`}
          className="icon-button"
        >
          <ArrowUpRight size={17} />
        </Link>
      )}
    </article>
  );
}
export function SectionHeading({
  title,
  href,
  label = "View all",
  note,
}: {
  title: string;
  href?: string;
  label?: string;
  note?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>
      {href && (
        <Link href={href} aria-label={label || `View ${title}`}>
          {label}
          <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function EmptyState({
  title = "You’re all caught up.",
  description = "No notices match these filters. Try a broader category or distance.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Check />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
