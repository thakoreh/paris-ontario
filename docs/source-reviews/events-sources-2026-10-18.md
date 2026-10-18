# Events source review — 2026-10-18

Evidence: `/tmp/pp-findings.md`, read-only recon performed October 18 at approximately 15:15 ET using `ParisPulseBot/1.0 (+https://parispulse.ca)`. This implementation made no network requests. Missing terms pages do not establish permission or a license.

| Source | Recorded robots / access findings | Recorded terms findings | Decision |
| --- | --- | --- | --- |
| brantevents.org | Disallows `/admin/`, `/moderate/`, `/accounts/`, `/claim/`, `/profile/`, `/submit/`, `/api/`, `/events.geojson`, and `/?` query strings. `/events.rss` and `/events/<slug>/` allowed; pages contain Event JSON-LD. | `/about`, `/terms`, `/privacy` returned 404; no terms found. | Narrow RSS discovery and allowed event pages only. Regional community aggregator, never official: every candidate held with `untrusted_source`; require Paris locality and source dates. |
| www.brant.ca events | Robots disallow `/bin/`, `/config/`, `/install/`, `/umbraco/`, `/views/`, `/sandbox/`, `/members-area/`. `/events/` returned 403 to the identifying UA. | `/terms-of-use/` returned 404; no terms page found. | Blocked; do not fetch events or bypass 403. |
| County of Brant Culture Days | Recon identifies an existing source registry row but supplies no separate Culture Days page/access result. County host rules above apply; no event feed validated. | No separate terms review recorded; County terms lookup above was 404. | Defer ingestion pending source-specific review; do not infer event data or access approval. |
| parisfairgrounds.com (www host in recon) | No disallow rules. `/events` is HTML only, Organization JSON-LD only, with Facebook event links; fragile scraping. | No terms findings recorded. | Defer automated ingestion; no structured Event feed validated. |
| culturedays.ca | Disallows `/en/events?*` query strings; event detail pages allowed. | No terms findings recorded. | Defer ingestion pending structured-source and terms review; never fetch search query URLs. |
| www.brantlibrary.ca calendar | Disallows `/en/inc/`, including `/en/inc/calendar.aspx` and news.aspx. Hours page allowed, no feed/JSON-LD there. | No terms findings recorded. | Never fetch the disallowed calendar; allowed hours page is not an events feed. |

No invented data. Keep source attribution on every record. Never fetch disallowed paths or query strings. Brant Events is restricted to the exact HTTPS feed URL and event slug pages without queries, fragments, alternate hosts, credentials, or ports; reject redirects. Use at most 40 event pages per run, at least one second between requests, a 12-second timeout, and a 2 MiB response cap.

Dry-run is the default. The optional writer can only create held drafts; it cannot verify/publish this source or enable registry ingestion. The new migration is not applied. `notices` has `start_at`/`end_at` event columns (singular), so these hold the source timestamps; no deadline companion is necessary. Audit and lock files are local to `.events-ingest-state/` by default.
