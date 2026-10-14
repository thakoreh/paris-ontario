import Link from "next/link";
import { ExplorePage } from "@/components/explore-page";
import { publicRouteMetadata } from "@/lib/seo";
export const metadata = publicRouteMetadata({
  title: "Explore Paris, Ontario",
  description:
    "Find official trail, river, downtown and visitor information for Paris, Ontario, alongside the local notice map.",
  path: "/explore",
});
export default function Page() {
  return (
    <>
      <ExplorePage />
      <div className="page-wrap">
        <Link className="button outline" href="/paris-ontario">
          Paris resource guide
        </Link>
      </div>
    </>
  );
}
