import { TodayPage } from "@/components/today-page";
import { publicData } from "@/lib/repository";
import { publicRouteMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = publicRouteMetadata({
  title: "Paris, Ontario local updates and resources",
  description:
    "Source-linked local updates, practical resources and community information for Paris, Ontario.",
  path: "/",
});

// Keep home outside the catch-all loading boundary: the footer must first paint
// with the complete feed, rather than below a short streaming fallback.
export default async function HomePage() {
  const now = new Date();
  const data = await publicData(now);
  return <TodayPage {...data} unavailable={!!data.error} now={now} />;
}
