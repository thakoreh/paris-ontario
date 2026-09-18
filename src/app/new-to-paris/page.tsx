import type { Metadata } from "next";
import { publicRouteMetadata } from "@/lib/seo";
import { NewcomerChecklist } from "@/components/resident-guide";
export const metadata: Metadata = publicRouteMetadata({
  title: "Moving to Paris Ontario: newcomer checklist",
  description:
    "A practical checklist for new Paris, Ontario residents: address changes, collection schedules, library membership, transit, recreation and property taxes.",
  path: "/new-to-paris",
});
export default function Page() {
  return <NewcomerChecklist />;
}
