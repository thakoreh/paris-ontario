"use client";

import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { useState } from "react";
import { filterParisResources } from "@/data/paris-resources";
import "./resource-hub.css";

export function ParisOntarioResourceHub() {
  const [query, setQuery] = useState("");
  const resources = filterParisResources(query);

  return (
    <div className="page-wrap resource-hub">
      <span className="eyebrow">PARIS, ONTARIO RESOURCE HUB</span>
      <h1>Practical Paris, Ontario information, without the scavenger hunt.</h1>
      <p className="page-intro">
        Start with a task, then open the official source for the current details.
        Paris Pulse does not replace the organizations that run these services.
      </p>
      <div className="message-box">
        Information can change. Each guide is a manually reviewed starting point,
        not a live status feed. Check the original source before you travel,
        book, pay or rely on a service.
      </div>
      <label className="resource-search">
        <span>Find a guide</span>
        <div>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder="Try trails, parking, family or moving"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </label>
      <p role="status" aria-live="polite" className="resource-count">
        {resources.length} {resources.length === 1 ? "guide" : "guides"} found
      </p>
      {resources.length === 0 ? (
        <div className="panel">
          <h2>No guide matches that search.</h2>
          <p>Try a broader task, or browse everyday services and local updates.</p>
          <div className="action-row">
            <Link href="/services" className="button outline">
              Everyday services
            </Link>
            <Link href="/today" className="button outline">
              Local updates
            </Link>
          </div>
        </div>
      ) : (
        <div className="resource-grid">
          {resources.map((resource) => (
            <article className="panel resource-card" key={resource.id}>
              <span className="card-eyebrow">START HERE</span>
              <h2>{resource.title}</h2>
              <p className="resource-task">{resource.task}</p>
              <p>{resource.summary}</p>
              <h3>Official sources</h3>
              <ul>
                {resource.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      className="text-link"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.label} <ArrowUpRight size={14} aria-hidden="true" />
                    </a>
                    <small>{source.organization}</small>
                  </li>
                ))}
              </ul>
              <small className="guide-provenance">
                Links and summaries reviewed <time dateTime={resource.reviewedAt}>{resource.reviewedAt}</time>.
              </small>
            </article>
          ))}
        </div>
      )}
      <section className="panel resource-next">
        <h2>Keep going</h2>
        <p>
          Use the dedicated pages when you need a service finder, a newcomer
          checklist or source-linked local notices.
        </p>
        <div className="action-row">
          <Link href="/services" className="button primary">
            Search everyday services
          </Link>
          <Link href="/new-to-paris" className="button outline">
            Newcomer checklist
          </Link>
          <Link href="/sources" className="button outline">
            How sources are reviewed
          </Link>
        </div>
      </section>
    </div>
  );
}
