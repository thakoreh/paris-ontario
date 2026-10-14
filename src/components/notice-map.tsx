"use client";
import { useEffect, useRef, useState } from "react";
import { withRetry } from "@/lib/retry";
import type { Notice, Location } from "@/types";
import { community } from "@/config/community";
import { noticeKind } from "@/lib/resident-experience";
import { loadExploreLayer } from "@/lib/explore-map-data";
import exploreSources from "../../public/data/explore/sources.json";
import { categoryLabels } from "@/types";

type MapData = {
  notices: Notice[];
  locations: Location[];
  radius: number;
  pick?: { latitude: number; longitude: number };
};
export default function NoticeMap({
  notices,
  exploreLayers = false,
  locations = [],
  radius = 0,
  pick,
  onPick,
  selectedNoticeId,
  onSelectNotice,
}: Omit<MapData, "locations" | "radius"> & {
  exploreLayers?: boolean;
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
  const [layerError, setLayerError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    selectCallback.current = onSelectNotice;
  }, [onSelectNotice]);
  // Parent rerenders (bookmark or selection) must not tear down an unchanged map.
  const dataKey = JSON.stringify({ notices, locations, radius, pick });
  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    let map: import("leaflet").Map | undefined;
    const data: MapData = JSON.parse(dataKey);
    const mapMarkers = markers.current;
    void (async () => {
      const L = (await withRetry(() => import("leaflet"))).default;
      await withRetry(() => import("leaflet.markercluster"));
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
      if (exploreLayers) {
        const overlays: Record<string, import("leaflet").Layer> = { Notices: cluster };
        const pending = new Set<string>();
        const loaded = new Set<string>();
        for (const source of exploreSources) {
          const group = L.layerGroup();
          overlays[source.name] = group;
          const load = async () => {
            if (loaded.has(source.id) || pending.has(source.id)) return;
            pending.add(source.id);
            try {
              const response = await loadExploreLayer(source.path, controller.signal);
              if (disposed) return;
              L.geoJSON(response, {
                style: { color: "#1f7a74", weight: 4 },
                pointToLayer: (_, latlng) => L.circleMarker(latlng, {
                  radius: 7, color: source.id === "parking" ? "#725735" : "#155c57",
                  fillOpacity: 0.8,
                }),
              }).addTo(group);
              loaded.add(source.id);
              setLayerError(null);
            } catch {
              if (!disposed) {
                map?.removeLayer(group);
                setLayerError(`${source.name} couldn’t load. Toggle it again to retry.`);
              }
            } finally { pending.delete(source.id); }
          };
          map.on("overlayadd", (event: import("leaflet").LayersControlEvent) => {
            if (event.layer === group) void load();
          });
        }
        L.control.layers(undefined, overlays, { collapsed: false }).addTo(map);
      }
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
      controller.abort();
      map?.remove();
      clusterRef.current = null;
      mapMarkers.clear();
    };
  }, [dataKey, onPick, retryKey, exploreLayers]);
  useEffect(() => {
    if (!selectedNoticeId) return;
    const marker = markers.current.get(selectedNoticeId);
    if (marker && clusterRef.current)
      clusterRef.current.zoomToShowLayer(marker, () => marker.openPopup());
  }, [selectedNoticeId, revision]);
  return (
    <>
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
      {layerError && <p role="status" className="map-layer-error">{layerError}</p>}
      {failed && (
        <div
          className="map-loading"
          role="status"
          style={{ position: "absolute", inset: 0 }}
        >
          <p>
            The map couldn’t load. The same updates are available in the list.
          </p>
          <button
            className="button outline"
            onClick={() => {
              setFailed(false);
              setRetryKey((value) => value + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
    {exploreLayers && <aside className="map-sources" aria-label="Map data sources">
      {exploreSources.map((source) => <a key={source.id} href={source.source_url} target="_blank" rel="noreferrer">
        {source.name} · County of Brant Open Data · checked {source.checked} ↗
      </a>)}
    </aside>}
    </>
  );
}
