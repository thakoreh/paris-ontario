import { AlertsPage } from "@/components/alerts-page";
import { privateRouteMetadata } from "@/lib/seo";
export const metadata = privateRouteMetadata("Alerts");
export default function Page() {
  return <AlertsPage />;
}
