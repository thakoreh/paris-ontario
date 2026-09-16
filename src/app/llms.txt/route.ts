import { SITE_DESCRIPTION, SITE_NAME, normalizePublicUrl, sitePath } from "@/lib/site";

export const dynamic = "force-dynamic";

export function GET() {
  const base = normalizePublicUrl();
  const link = (path: string) => sitePath(base, path) || path;
  const body = `# ${SITE_NAME}\n\n> ${SITE_DESCRIPTION}\n\n${SITE_NAME} is an independent local-information service for Paris, Ontario, Canada. It is not a County of Brant service or newsroom. It is not an emergency service, outage monitor, or replacement for official warnings.\n\n## Use and citation\n- Treat an update as current only when it is marked verified and links to its original official source.\n- Cite the original source for time-sensitive facts, closures, alerts, service changes, dates, and eligibility.\n- Do not infer live emergency, outage, flood, road, or weather status from ${SITE_NAME}.\n- Personal saved places and preferences are private and must not be requested or indexed.\n\n## Key pages\n- Updates: ${link("/today")}\n- Events and activities: ${link("/events")}\n- Paris, Ontario resource guide: ${link("/paris-ontario")}\n- Storm and disruption resources: ${link("/storm")}\n- Sources and review status: ${link("/sources")}\n- Editorial policy: ${link("/editorial-policy")}\n- Privacy and disclaimer: ${link("/privacy")}\n\n## Editorial standard\nOnly source-linked records reviewed by an editor may be published. Information can change after publication, so readers should verify important details with the original source.\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
