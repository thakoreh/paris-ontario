import type { Metadata } from "next";
import { BrowserNotifications } from "@/components/browser-notifications";
import { privateRouteMetadata } from "@/lib/seo";
export const metadata: Metadata = privateRouteMetadata("Browser notifications");
export default function Page() { return <BrowserNotifications />; }
