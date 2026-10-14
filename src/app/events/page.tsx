import { Suspense } from "react";
import { publicData } from "@/lib/repository";
import { publicRouteMetadata } from "@/lib/seo";
import { EventsPage } from "@/components/events-page";
export const dynamic = "force-dynamic";
export const metadata = publicRouteMetadata({ title: "What's on in Paris", description: "Source-linked events and official calendars for Paris, Ontario.", path: "/events" });
export default async function Page() {
  const data = await publicData();
  return <Suspense fallback={<div className="page-wrap"><h1>What&apos;s on</h1></div>}><EventsPage notices={data.notices} sources={data.sources} unavailable={!!data.error} now={new Date().toISOString()} /></Suspense>;
}
