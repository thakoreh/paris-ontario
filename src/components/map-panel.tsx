"use client";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import dynamic from "next/dynamic";
import { withRetry } from "@/lib/retry";
export const MapPanel = dynamic(() => withRetry(() => import("./notice-map")), {
  ssr: false,
  loading: () => (
    <div className="map-loading">Loading the neighbourhood map…</div>
  ),
});
