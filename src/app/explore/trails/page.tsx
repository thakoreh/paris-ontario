import Link from "next/link";
import { trailEntries } from "@/lib/explore-content";
import { ExploreEntryCard } from "@/components/explore-entry";
import { publicRouteMetadata } from "@/lib/seo";
export const metadata = publicRouteMetadata({
  title: "Paris trails & Grand River",
  description:
    "Official links for Cambridge to Paris Rail Trail, SC Johnson Trail, Watts Pond Trail and Grand River recreation and conditions.",
  path: "/explore/trails",
});
export default function Page() {
  return (
    <div className="page-wrap revamp-page">
      <h1>Trails & river</h1>
      <p>
        Check official route, trailhead, parking and river guidance before you
        go.
      </p>
      <section aria-label="Trail and river guides">
        <div className="explore-grid explore-trails">
          {trailEntries.map((entry) => (
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
