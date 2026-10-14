import { RouteLoading } from "@/components/route-loading";

// /events awaits publicData() before paint; keep visible feedback on slow loads.
export default function Loading() {
  return <RouteLoading label="Finding what's on in Paris…" />;
}
