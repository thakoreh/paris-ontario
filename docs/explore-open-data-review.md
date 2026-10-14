# Explore official data review — 2026-10-14

BLOCKED: curl could not resolve any of the official data hosts from this workspace (exit 6).

Attempted sources:
- County of Brant ArcGIS discovery: https://www.arcgis.com/sharing/rest/search?f=json&q=owner:CountyofBrant
- Ontario GeoHub: https://geohub.lio.gov.on.ca/
- GRCA: https://www.grandriver.ca/

No geometry was fetched or drawn. Trail, river-access and parking toggles remain hidden; the map displays notices only. Retry official discovery and download with provenance before exposing any additional layer.

The visiting accommodation entry is also BLOCKED: curl could not resolve https://downtownparis.ca/visiting-us/. No unverified accommodation entry or checked date was added.

The night-market correction uses the replacement recorded in /workspace/parispulse-audit/qa-report.md (H3). Its guarded migration was written but not run.

## Validation and repository limits

- Worktree HEAD before these edits: d4fa93c48c1e293961f94f9dc862acdef6258e52.
- Per-item commits cannot write /workspace/paris-ontario/.git/worktrees/parispulse-revamp/index.lock (read-only sandbox); pushes cannot resolve github.com.
- Installed Next.js 15.5.27 has no node_modules/next/dist/docs directory.
- Playwright was invoked with --workers=1, but its web server exited before any tests ran. Direct server startup reports listen EPERM on 127.0.0.1:3017.
- Production build failed with webpack errors; no detailed error was emitted.
- Lighthouse invocation with headless Chrome could not download lighthouse from registry.npmjs.org (EAI_AGAIN); Accessibility/SEO scores are unavailable.
- No Supabase writes, publisher runs, deploys or merges were performed. Migration validation uses an isolated in-memory PGlite database only.
