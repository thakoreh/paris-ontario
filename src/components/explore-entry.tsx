import Link from "next/link";
import type { ExploreEntry } from "@/lib/explore-content";
export function ExploreEntryCard({
  entry,
  headingLevel = 3,
  compact = false,
}: {
  entry: ExploreEntry;
  headingLevel?: 2 | 3;
  compact?: boolean;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  if (compact && (entry.category === "trails" || entry.category === "river"))
    return (
      <article className="panel explore-entry explore-entry-trail-preview">
        <a href={entry.source_url} target="_blank" rel="noreferrer">
          <Heading>{entry.title} ›</Heading>
          <span className="explore-trail-meta">
            <span className="explore-trail-source" title={entry.organization}>
              {entry.organization} ↗
            </span>
            <span className="explore-trail-reviewed">
              · Checked <time dateTime={entry.reviewed_at}>{entry.reviewed_at}</time>
            </span>
          </span>
        </a>
      </article>
    );
  if (compact)
    return (
      <article className="panel explore-entry explore-entry-compact">
        <Heading>
          <a className="text-link" href={entry.href || entry.source_url}>
            {entry.title} ›
          </a>
        </Heading>
        <p>{entry.description}</p>
        <a
          className="text-link explore-entry-source"
          href={entry.source_url}
          target="_blank"
          rel="noreferrer"
        >
          {entry.organization} ↗ · Checked{" "}
          <time dateTime={entry.reviewed_at}>{entry.reviewed_at}</time>
        </a>
      </article>
    );
  return (
    <article className="panel explore-entry">
      <Heading>
        {entry.href ? (
          <Link className="text-link" href={entry.href}>
            {entry.title} ›
          </Link>
        ) : (
          entry.title
        )}
      </Heading>
      <p>{entry.description}</p>
      <a
        className="text-link"
        href={entry.source_url}
        target="_blank"
        rel="noreferrer"
      >
        Source: {entry.organization} ↗
      </a>
      <small>
        Checked <time dateTime={entry.reviewed_at}>{entry.reviewed_at}</time>
      </small>
    </article>
  );
}
