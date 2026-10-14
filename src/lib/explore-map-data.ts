import type { Notice } from "@/types";
import { withRetry } from "./retry";
export async function loadExploreNotices(
  signal?: AbortSignal,
): Promise<Notice[]> {
  return withRetry(async () => {
    // An unmounted view must not start another request during backoff.
    signal?.throwIfAborted();
    const response = await fetch("/api/explore", { signal, cache: "no-store" });
    if (!response.ok) throw new Error("Notice map unavailable");
    const data = (await response.json()) as { notices: Notice[] };
    if (!Array.isArray(data.notices)) throw new Error("Invalid map response");
    return data.notices;
  });
}
