"use client";
import { useState } from "react";
import { filterServices, residentServices } from "@/data/resident-services";
export function ServicesDirectory() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const services = filterServices(query, category);
  return (
    <>
      <div className="guide-controls">
        <label>
          Search services
          <input
            type="search"
            value={query}
            placeholder="Try trash, bus, library or doctor"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Service category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {[...new Set(residentServices.map((s) => s.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button
          className="button outline"
          onClick={() => {
            setQuery("");
            setCategory("all");
          }}
        >
          Clear filters
        </button>
      </div>
      {services.length ? (
        <div className="panel service-rows">
          {services.map((service) => (
            <a
              id={service.id}
              className="service-row"
              key={service.id}
              href={service.url}
              target="_blank"
              rel="noreferrer"
            >
              <strong>{service.title} ↗</strong>
              <span>
                Source: {service.organization} · Checked{" "}
                <time dateTime={service.checkedAt}>{service.checkedAt}</time>
              </span>
            </a>
          ))}
        </div>
      ) : (
        <p role="status">
          No services match those filters. Try a shorter search or clear the
          category.
        </p>
      )}
      <a
        className="panel service-row"
        href="https://www.brant.ca/community-and-support/utilities/"
        target="_blank"
        rel="noreferrer"
      >
        <strong>Water & utilities ↗</strong>
        <span>
          Source: County of Brant · Checked{" "}
          <time dateTime="2026-10-14">2026-10-14</time>
        </span>
      </a>
    </>
  );
}
