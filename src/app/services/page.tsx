import type { Metadata } from "next";
import { publicRouteMetadata } from "@/lib/seo";
import { ResidentServices } from "@/components/resident-guide";
export const metadata: Metadata = publicRouteMetadata({
  title: "Paris Ontario resident services",
  description:
    "Find official links for Paris, Ontario garbage collection, Brant Transit, library membership, recreation, property taxes and health advice.",
  path: "/services",
});
export default function Page() {
  return <ResidentServices />;
}
