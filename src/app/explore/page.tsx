import Link from "next/link";
import { Feed } from "@/components/feed";
import { publicData } from "@/lib/repository";
import { publicRouteMetadata } from "@/lib/seo";
export const dynamic = "force-dynamic";
export const metadata = publicRouteMetadata({
  title: "Explore Paris, Ontario",
  description:
    "Explore source-linked local notices and their affected areas around Paris, Ontario.",
  path: "/explore",
});
export default async function Page() {
  const data = await publicData();
  return (
    <>
      {data.error ? (
        <div className="page-wrap">
          <h1>Explore Paris</h1>
          <p>Local updates are temporarily unavailable.</p>
        </div>
      ) : (
        <Feed {...data} mode="map" />
      )}
      <div className="page-wrap">
        <Link className="button outline" href="/paris-ontario">
          Paris resource guide
        </Link>
      </div>
    </>
  );
}
