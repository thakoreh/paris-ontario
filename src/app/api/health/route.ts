export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const READINESS_TIMEOUT_MS = 3_000;
const PUBLIC_TABLES = ["notices", "deadlines", "official_sources"];

// Readiness checks anonymous public reads, not a privileged service-role client.
// HEAD + limit=1 avoids fetching content or counting the entire dataset. Empty
// tables are healthy: this endpoint checks availability, not editorial coverage.
export async function GET() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const configured = Boolean(configuredUrl && anonKey);
  let ready = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();

  if (configured) {
    try {
      const base = new URL(configuredUrl!);
      if (
        !["https:", "http:"].includes(base.protocol) ||
        base.username ||
        base.password ||
        base.search ||
        base.hash ||
        (process.env.NODE_ENV === "production" && base.protocol !== "https:")
      )
        throw new Error("Invalid backend configuration");

      const deadline = new Promise<boolean>((resolve) => {
        timeout = setTimeout(() => {
          controller.abort();
          resolve(false);
        }, READINESS_TIMEOUT_MS);
      });
      const checks = Promise.all(
        PUBLIC_TABLES.map(async (table) => {
          const url = new URL(`/rest/v1/${table}`, base);
          url.searchParams.set("select", "id");
          url.searchParams.set("limit", "1");
          const response = await fetch(url, {
            method: "HEAD",
            headers: { apikey: anonKey!, Authorization: `Bearer ${anonKey!}` },
            cache: "no-store",
            redirect: "error",
            signal: controller.signal,
          });
          return (
            response.ok &&
            Boolean(
              response.headers
                .get("content-type")
                ?.includes("application/json"),
            )
          );
        }),
      ).then((results) => results.every(Boolean));
      // The race also bounds response time if a fetch implementation ignores abort.
      ready = await Promise.race([checks, deadline]);
    } catch {
      // Never expose upstream errors, configuration, credentials or database rows.
      ready = false;
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  }

  return Response.json(
    {
      ok: ready,
      service: "paris-pulse",
      dataMode: configured ? "supabase" : "preview",
      readiness: ready ? "ready" : "unavailable",
    },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
