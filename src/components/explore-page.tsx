"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Notice } from "@/types";
import {
  exploreCategories,
  filterExplore,
  trailEntries,
  visitingEntries,
  type ExploreCategory,
} from "@/lib/explore-content";
import { loadExploreNotices } from "@/lib/explore-map-data";
import { MapPanel } from "./map-panel";
import { NoticeCard } from "./cards";
import { ExploreEntryCard } from "./explore-entry";
export function ExplorePage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [category, setCategory] = useState<ExploreCategory>("all");
  const [view, setView] = useState<"list" | "map">("list");
  const mapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view !== "map") return;
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    void loadExploreNotices(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setNotices(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [view, retryKey]);
  const trails = filterExplore(trailEntries, category);
  const visiting = filterExplore(visitingEntries, category);
  return (
    <div className="page-wrap revamp-page explore-page">
      <h1>Explore Paris</h1>
      <div className="action-row explore-chips" aria-label="Explore categories">
        {exploreCategories.map((c) => (
          <button
            key={c}
            className={`button ${category === c ? "primary" : "outline"}`}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c[0].toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>
      <div className="explore-map-card panel" ref={mapRef}>
        {view === "map" ? (
          <>
            {loading ? (
              <p role="status">Loading notice map…</p>
            ) : failed ? (
              <div role="status">
                <MapPanel notices={[]} exploreLayers />
                <p>
                  The notice map couldn’t load. Official guides remain available
                  below.
                </p>
                <button
                  className="button outline"
                  onClick={() => setRetryKey((key) => key + 1)}
                >
                  Retry
                </button>
              </div>
            ) : (
              <MapPanel notices={notices} exploreLayers />
            )}
            <button className="button outline" onClick={() => setView("list")}>Close map</button>
            <button
              className="button outline"
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else void mapRef.current?.requestFullscreen?.().catch(() => {});
              }}
            >
              Toggle full screen
            </button>
            <p>
              County of Brant trails, river access, parking and local notices.
            </p>
          </>
        ) : (
          <button
            className="explore-map-preview"
            onClick={() => setView("map")}
          >
            Open map · trails, river & parking ›
          </button>
        )}
      </div>
      <Link href="/paris-ontario">Paris resource guide ›</Link>
      {category === "all" && notices.length > 0 && (
        <section>
          <h2>Local notices</h2>
          {notices.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} />
          ))}
        </section>
      )}
      {trails.length > 0 && (
        <section>
          <div className="section-heading">
            <h2>Trails & river</h2>
            <Link href="/explore/trails">All trails & river ›</Link>
          </div>
          <div className="explore-grid">
            {trails.map((entry) => (
              <ExploreEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      )}
      {visiting.length > 0 && (
        <section>
          <div className="section-heading">
            <h2>Visiting Paris</h2>
            <Link href="/explore/visiting">Visitor guide ›</Link>
          </div>
          <div className="explore-grid">
            {visiting.map((entry) => (
              <ExploreEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
