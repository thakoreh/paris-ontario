"use client";
import { useEffect, useRef } from "react";
import type { Notice, Location } from "@/types";
import { community } from "@/config/community";
export default function NoticeMap({
  notices,
  locations = [],
  radius = 0,
  pick,
  onPick,
}: {
  notices: Notice[];
  locations?: Location[];
  radius?: number;
  pick?: { latitude: number; longitude: number };
  onPick?: (lat: number, lng: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    void (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.markercluster");
      if (disposed || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false }).setView(
        [
          pick?.latitude ?? locations[0]?.latitude ?? community.latitude,
          pick?.longitude ?? locations[0]?.longitude ?? community.longitude,
        ],
        14,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      const cluster = L.markerClusterGroup();
      for (const n of notices) {
        if (n.latitude === null || n.longitude === null) continue;
        const link = document.createElement("a");
        link.href = `/notice/${n.slug}`;
        link.textContent = `${n.is_sample ? "Sample data · " : ""}${n.title}`;
        const marker = L.marker([n.latitude, n.longitude], {
          icon: L.divIcon({
            className: "pulse-marker",
            html: "<span></span>",
            iconSize: [28, 28],
          }),
          title: n.title,
        }).bindPopup(link);
        cluster.addLayer(marker);
      }
      map.addLayer(cluster);
      for (const l of locations) {
        L.circleMarker([l.latitude, l.longitude], {
          radius: 8,
          color: "#fff",
          fillColor: "#214f45",
          fillOpacity: 1,
          weight: 3,
        })
          .addTo(map)
          .bindTooltip(l.label);
        if (radius > 0)
          L.circle([l.latitude, l.longitude], {
            radius: radius * 1000,
            color: "#387966",
            weight: 1,
            fillOpacity: 0.05,
          }).addTo(map);
      }
      let marker: import("leaflet").CircleMarker | undefined;
      if (pick)
        marker = L.circleMarker([pick.latitude, pick.longitude], {
          radius: 9,
          color: "#245b49",
        }).addTo(map);
      if (onPick)
        map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
          marker?.remove();
          marker = L.circleMarker(e.latlng, {
            radius: 9,
            color: "#245b49",
          }).addTo(map!);
          onPick(e.latlng.lat, e.latlng.lng);
        });
    })();
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [notices, locations, radius, pick, onPick]);
  return (
    <div
      ref={ref}
      className="leaflet-map"
      role="region"
      aria-label={
        onPick
          ? "Choose a location on the map"
          : "Map of notice locations. Equivalent notices are available in the list."
      }
    />
  );
}
