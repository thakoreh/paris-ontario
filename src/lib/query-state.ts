"use client";

import { useSyncExternalStore } from "react";

const event = "parispulse:query-change";
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(event, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(event, callback);
  };
}
export function queryUrl(href: string, changes: Record<string, string | null>) {
  const url = new URL(href);
  for (const [key, value] of Object.entries(changes)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
export function updateQuery(changes: Record<string, string | null>) {
  const next = queryUrl(window.location.href, changes);
  window.history.pushState(null, "", next);
  window.dispatchEvent(new Event(event));
}
export function queryValue(
  params: URLSearchParams,
  key: string,
  fallback: string,
  allowed?: readonly string[],
) {
  const value = params.get(key);
  return value !== null && (!allowed || allowed.includes(value))
    ? value
    : fallback;
}
export function useQueryState(
  key: string,
  fallback = "",
  allowed?: readonly string[],
) {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  const value = queryValue(new URLSearchParams(search), key, fallback, allowed);
  return [
    value,
    (next: string) => updateQuery({ [key]: next === fallback ? null : next }),
  ] as const;
}
