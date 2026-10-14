"use client";
import dynamic from "next/dynamic";
import { withRetry } from "@/lib/retry";
export const MapPanel = dynamic(() => withRetry(() => import("./notice-map")), {
  ssr: false,
  loading: () => (
    <div className="map-loading">Loading the neighbourhood map…</div>
  ),
});
