import type { Metadata } from "next";
import { ResidentServices } from "@/components/resident-guide";
export const metadata: Metadata = {
  title: "Paris Ontario resident services",
  description:
    "Find official links for Paris, Ontario garbage collection, Brant Transit, library membership, recreation, property taxes and health advice.",
  alternates: { canonical: "/services" },
};
export default function Page() {
  return <ResidentServices />;
}
