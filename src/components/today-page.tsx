import React from "react";
import { SiteSearch } from "./site-search";
import Link from "next/link";
import type { Deadline, Notice, Source } from "@/types";
import {
  essentials,
  parisGreeting,
  quickTasks,
  todayContent,
} from "@/lib/today";
import { NoticeCard, DeadlineCard } from "./cards";
export function TodayPage({
  notices,
  deadlines,
  sources,
  unavailable = false,
  now = new Date(),
}: {
  notices: Notice[];
  deadlines: Deadline[];
  sources: Source[];
  unavailable?: boolean;
  now?: Date;
}) {
  const content = todayContent(notices, deadlines, now);
  const quiet =
    !content.weekend.length &&
    !content.deadlines.length;
  return (
    <div className="page-wrap revamp-page today-page">
      <p className="eyebrow">
        {new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Toronto",
          weekday: "short",
          month: "short",
          day: "numeric",
        }).format(now)}{" "}
        · Paris, Ontario
      </p>
      <h1>{parisGreeting(now)}</h1>
      <nav className="essentials-strip" aria-label="Today essentials">
        {essentials.map((tile) => (
          <a
            className="panel"
            key={tile.title}
            href={tile.url}
            target="_blank"
            rel="noreferrer"
          >
            <strong>{tile.title} ↗</strong>
            <span>{tile.source}</span>
          </a>
        ))}
      </nav>
      <div className="today-columns">
        {content.deadlines.length > 0 && (
          <section className="today-deadlines">
            <div className="section-heading">
              <h2>Deadlines</h2>
              <Link href="/deadlines">All deadlines ›</Link>
            </div>
            {content.deadlines.map((d) => (
              <DeadlineCard key={d.id} deadline={d} />
            ))}
          </section>
        )}
        <div className="today-main">
          {content.weekend.length > 0 && (
            <section>
              <div className="section-heading">
                <h2>This weekend</h2>
                <Link href="/events">All events ›</Link>
              </div>
              {content.weekend.map((n) => (
                <NoticeCard
                  key={n.id}
                  notice={n}
                  source={sources.find((s) => s.id === n.source_id)}
                />
              ))}
            </section>
          )}
          {!quiet && content.notices.length > 0 && (
            <section>
              <h2>Local notices</h2>
              {content.notices.map((n) => (
                <NoticeCard
                  key={n.id}
                  notice={n}
                  source={sources.find((s) => s.id === n.source_id)}
                />
              ))}
            </section>
          )}
          {(quiet || unavailable) && (
            <div className="panel quiet-week">
              <h2>
                {unavailable
                  ? "Local updates are temporarily unavailable."
                  : "Quiet week in Paris."}
              </h2>
              <p>Browse Services or Explore.</p>
              <div className="action-row">
                <Link className="button primary" href="/services">
                  Services
                </Link>
                <Link className="button outline" href="/explore">
                  Explore
                </Link>
              </div>
            </div>
          )}
        </div>
        <section className="today-tasks">
          <h2>Quick tasks</h2>
          <nav className="quick-task-grid" aria-label="Quick tasks">
            {quickTasks.map((task) =>
              task.href.startsWith("/") ? (
                <Link className="panel" key={task.title} href={task.href}>
                  {task.title} ›
                </Link>
              ) : (
                <a
                  className="panel"
                  key={task.title}
                  href={task.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {task.title} ↗
                </a>
              ),
            )}
          </nav>
          <div className="today-explore">
            <h2>Explore</h2>
            <nav className="quick-task-grid" aria-label="Explore shortcuts">
              <Link className="panel" href="/explore/trails">Trails & river ›</Link>
              <Link className="panel" href="/explore/visiting">Visiting Paris ›</Link>
              <Link className="panel" href="/explore">Open map ›</Link>
              <Link className="panel" href="/services/council">Council ›</Link>
            </nav>
          </div>
        </section>
      </div>
      <SiteSearch notices={notices} />
    </div>
  );
}
