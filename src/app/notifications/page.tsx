import type { Metadata } from "next";
import { BrowserNotifications } from "@/components/browser-notifications";
export const metadata: Metadata = { title: "Browser notifications", robots: { index: false, follow: false } };
export default function Page() { return <BrowserNotifications />; }
