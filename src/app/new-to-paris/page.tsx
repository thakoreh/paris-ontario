import type { Metadata } from "next";
import { NewcomerChecklist } from "@/components/resident-guide";
export const metadata: Metadata = {
  title: "Moving to Paris Ontario: newcomer checklist",
  description:
    "A practical checklist for new Paris, Ontario residents: address changes, collection schedules, library membership, transit, recreation and property taxes.",
  alternates: { canonical: "/new-to-paris" },
};
export default function Page() {
  return <NewcomerChecklist />;
}
