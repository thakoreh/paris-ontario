import Link from "next/link";
import type { ExploreEntry } from "@/lib/explore-content";
export function ExploreEntryCard({
  entry,
  headingLevel = 3,
}: {
  entry: ExploreEntry;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
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
