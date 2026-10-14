import { ShareButton } from "@/components/share-button";
import { normalizePublicUrl } from "@/lib/site";
import Link from "next/link";
import { publicRouteMetadata } from "@/lib/seo";
import { ServicesDirectory } from "@/components/services-directory";
import "@/components/resident-guide.css";
export const metadata = publicRouteMetadata({
  title: "Paris Ontario resident services",
  description:
    "Find official links for council, garbage collection, transit, library, recreation, property tax and help settling into Paris, Ontario.",
  path: "/services",
});
export default function Page() {
  return (
    <div className="page-wrap revamp-page">
      <h1>Services</h1>
      <ShareButton base={normalizePublicUrl()?.toString() || ""} publicPath="/services" title="Paris Ontario resident services" />
      <Link className="panel service-entry" href="/services/council">
        <strong>Council & elections ›</strong>
        <span>
          Meeting information, councillors and wards · County of Brant
        </span>
      </Link>
      <section>
        <h2>Everyday</h2>
        <ServicesDirectory />
      </section>
      <section>
        <h2>When things go wrong</h2>
        <div className="panel service-rows">
          <Link className="service-row" href="/storm">
            <strong>Storm & outages ›</strong>
          </Link>
          <a
            className="service-row"
            href="https://www.municipal511.ca/"
            target="_blank"
            rel="noreferrer"
          >
            <strong>Road closures ↗</strong>
            <span>Source: Municipal511 · Checked 2026-10-14</span>
          </a>
        </div>
      </section>
      <section>
        <h2>New to Paris</h2>
        <Link className="panel service-entry" href="/new-to-paris">
          <strong>New to Paris checklist ›</strong>
          <span>Work through the essentials at your own pace.</span>
        </Link>
      </section>
      <Link className="button outline" href="/deadlines">
        Upcoming deadlines
      </Link>
    </div>
  );
}
