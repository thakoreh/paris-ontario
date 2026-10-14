"use client";
import React from "react";
import Link from "next/link";
import type { Notice } from "@/types";
import { useQueryState } from "@/lib/query-state";
import { searchSite } from "@/lib/site-search";

export function SiteSearch({ notices }: { notices: Notice[] }) {
  const [query, setQuery] = useQueryState("q");
  const results = searchSite(query, notices);
  return (
    <section aria-label="Site search">
      <label htmlFor="site-search">Search Paris Pulse</label>
      <input
        id="site-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Try garbage, trails or library"
      />
      {query.trim() ? (
        <div aria-live="polite">
          {results.length ? (
            <>
              <h2>Search results</h2>
              {results.map((result) => (
                <article className="panel" key={result.id}>
                  <span>{result.kind}</span>
                  <h3>
                    <Link href={result.href}>{result.title}</Link>
                  </h3>
                  <p>{result.description}</p>
                  <a href={result.sourceUrl}>Official source ↗</a>
                </article>
              ))}
            </>
          ) : (
            <p>
              No matches yet. Try a shorter search, or browse{" "}
              <Link href="/services">Services</Link> and{" "}
              <Link href="/explore">Explore</Link>.
            </p>
          )}
        </div>
      ) : (
        <p>Search services, guides, places to explore and local notices.</p>
      )}
    </section>
  );
}
