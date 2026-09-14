"use client";
import dynamic from "next/dynamic";
export const MapPanel = dynamic(() => import("./notice-map"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">Loading the neighbourhood map…</div>
  ),
});
