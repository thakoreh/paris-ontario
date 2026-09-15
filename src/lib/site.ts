import type { Source } from "@/types";

export const SITE_NAME = "Paris Pulse";
export const SITE_DESCRIPTION =
  "Source-linked local updates, deadlines and disruption information for Paris, Ontario.";

export function normalizePublicUrl(value = process.env.NEXT_PUBLIC_APP_URL): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

export function sitePath(base: URL | null, path = "/"): string | null {
  if (!base) return null;
  return new URL(path.replace(/^\//, ""), base).toString();
}

export function canonicalWwwRedirect(
  configuredUrl: string | undefined,
  requestUrl: URL,
): URL | null {
  const canonical = normalizePublicUrl(configuredUrl);
  if (!canonical || requestUrl.hostname !== `www.${canonical.hostname}`)
    return null;
  return new URL(`${requestUrl.pathname}${requestUrl.search}`, canonical);
}

export type ContentFreshness = {
  state: "current" | "attention" | "unknown";
  checkedSources: number;
  staleSources: number;
  newestCheck: string | null;
};

export function contentFreshness(
  sources: Source[],
  now = new Date(),
): ContentFreshness {
  const active = sources.filter((source) => source.active);
  if (!active.length)
    return {
      state: "unknown",
      checkedSources: 0,
      staleSources: 0,
      newestCheck: null,
    };

  const checks = active
    .map((source) => {
      const checked = source.last_checked_at ? new Date(source.last_checked_at) : null;
      const validCheck = checked && !Number.isNaN(checked.getTime()) ? checked : null;
      const intervalMs = Math.max(source.refresh_interval_minutes, 15) * 60_000;
      const overdue = !validCheck || now.getTime() - validCheck.getTime() > intervalMs;
      return { validCheck, overdue };
    });
  const currentChecks = checks.filter((check) => check.validCheck && !check.overdue);
  const newest = checks
    .flatMap((check) => (check.validCheck ? [check.validCheck] : []))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return {
    state: currentChecks.length === active.length ? "current" : "attention",
    checkedSources: checks.filter((check) => check.validCheck).length,
    staleSources: checks.filter((check) => check.overdue).length,
    newestCheck: newest?.toISOString() || null,
  };
}
