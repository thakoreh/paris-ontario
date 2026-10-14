import { RouteLoading } from "@/components/route-loading";

// /services/council awaits publicData() before paint; keep visible feedback on slow loads.
export default function Loading() {
  return <RouteLoading label="Loading council information…" />;
}
