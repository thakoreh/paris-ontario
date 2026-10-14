import Link from "next/link";
import { visitingEntries } from "@/lib/explore-content";
import { ExploreEntryCard } from "@/components/explore-entry";
import { publicRouteMetadata } from "@/lib/seo";
export const metadata = publicRouteMetadata({
  title: "Visiting Paris, Ontario",
  description:
    "Plan a visit with official links for downtown dining, parking, directions, local history and events in Paris, Ontario.",
  path: "/explore/visiting",
});
export default function Page() {
  return (
    <div className="page-wrap revamp-page">
      <h1>Visiting Paris</h1>
      <p>Plan your visit with the Downtown Paris BIA and County of Brant.</p>
      <section aria-label="Visitor guides">
        <div className="explore-grid">
          {visitingEntries.map((entry) => (
            <ExploreEntryCard key={entry.id} entry={entry} headingLevel={2} />
          ))}
        </div>
      </section>
      <Link className="button outline" href="/explore">
        Explore Paris
      </Link>
    </div>
  );
}
