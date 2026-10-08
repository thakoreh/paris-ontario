"use client";
import { useEffect, useRef, useState } from "react";
import type { Notice, Location } from "@/types";
import { community } from "@/config/community";
import { noticeKind } from "@/lib/resident-experience";
import { categoryLabels } from "@/types";

type MapData = {
  notices: Notice[];
  locations: Location[];
  radius: number;
  pick?: { latitude: number; longitude: number };
};
export default function NoticeMap({
  notices,
  locations = [],
  radius = 0,
  pick,
  onPick,
  selectedNoticeId,
  onSelectNotice,
}: Omit<MapData, "locations" | "radius"> & {
  locations?: Location[];
  radius?: number;
  onPick?: (lat: number, lng: number) => void;
  selectedNoticeId?: string | null;
  onSelectNotice?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const clusterRef = useRef<import("leaflet").MarkerClusterGroup | null>(null);
  const markers = useRef(new Map<string, import("leaflet").Marker>());
  const selectCallback = useRef(onSelectNotice);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    selectCallback.current = onSelectNotice;
  }, [onSelectNotice]);
  // Parent rerenders (bookmark or selection) must not tear down an unchanged map.
  const dataKey = JSON.stringify({ notices, locations, radius, pick });
  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    const data: MapData = JSON.parse(dataKey);
    const mapMarkers = markers.current;
    void (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.markercluster");
      if (disposed || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false }).setView(
        [
          data.pick?.latitude ??
            data.locations[0]?.latitude ??
            community.latitude,
          data.pick?.longitude ??
            data.locations[0]?.longitude ??
            community.longitude,
        ],
        14,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      const cluster = L.markerClusterGroup();
      clusterRef.current = cluster;
      mapMarkers.clear();
      for (const notice of data.notices) {
        if (notice.latitude === null || notice.longitude === null) continue;
        const popup = document.createElement("div");
        const label = document.createElement("p");
        label.textContent = `${notice.is_sample ? "Sample data · " : ""}${noticeKind(notice) === "business" ? "Local opening" : categoryLabels[notice.category]}`;
        const link = document.createElement("a");
        link.href = `/notice/${notice.slug}`;
        link.textContent = notice.title;
        popup.append(label, link);
        const marker = L.marker([notice.latitude, notice.longitude], {
          icon: L.divIcon({
            className: `pulse-marker kind-${noticeKind(notice)}`,
            html: "<span></span>",
            iconSize: [28, 28],
          }),
          title: notice.title,
          alt: notice.title,
        }).bindPopup(popup);
        marker.on("click", () => selectCallback.current?.(notice.id));
        mapMarkers.set(notice.id, marker);
        cluster.addLayer(marker);
      }
      map.addLayer(cluster);
      for (const location of data.locations) {
        const privateLabel = document.createElement("span");
        privateLabel.textContent = `${location.label} · private`;
        L.circleMarker([location.latitude, location.longitude], {
          radius: 8,
          color: "#fff",
          fillColor: "#214f45",
          fillOpacity: 1,
          weight: 3,
        })
          .addTo(map)
          .bindTooltip(privateLabel);
        if (data.radius > 0)
          L.circle([location.latitude, location.longitude], {
            radius: data.radius * 1000,
            color: "#387966",
            weight: 1,
            fillOpacity: 0.05,
          }).addTo(map);
      }
      let marker: import("leaflet").CircleMarker | undefined;
      if (data.pick)
        marker = L.circleMarker([data.pick.latitude, data.pick.longitude], {
          radius: 9,
          color: "#245b49",
        }).addTo(map);
      if (onPick)
        map.on("click", (event: import("leaflet").LeafletMouseEvent) => {
          marker?.remove();
          marker = L.circleMarker(event.latlng, {
            radius: 9,
            color: "#245b49",
          }).addTo(map!);
          onPick(event.latlng.lat, event.latlng.lng);
        });
      setFailed(false);
      setRevision((value) => value + 1);
    })().catch(() => {
      if (!disposed) setFailed(true);
    });
    return () => {
      disposed = true;
      map?.remove();
      clusterRef.current = null;
      mapMarkers.clear();
    };
  }, [dataKey, onPick]);
  useEffect(() => {
    if (!selectedNoticeId) return;
    const marker = markers.current.get(selectedNoticeId);
    if (marker && clusterRef.current)
      clusterRef.current.zoomToShowLayer(marker, () => marker.openPopup());
  }, [selectedNoticeId, revision]);
  return (
    <div className="leaflet-map" style={{ position: "relative" }}>
      <div
        ref={ref}
        style={{ height: "100%", width: "100%" }}
        role="region"
        aria-label={
          onPick
            ? "Choose a location on the map"
            : "Map of notice locations. Equivalent notices are available in the list."
        }
      />
      {failed && (
        <p
          className="map-loading"
          role="status"
          style={{ position: "absolute", inset: 0 }}
        >
          The map couldn’t load. The same updates are available in the list.
        </p>
      )}
    </div>
  );
}
