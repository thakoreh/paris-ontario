# Explore official data review — 2026-10-14

Official County of Brant geometry has been fetched and clipped to bbox
-80.43,43.16,-80.32,43.24. The versioned files in `public/data/explore/`
cover the Brant Trail Network, River access points and Parking Lots.
`sources.json` records each source URL, the licence note “County of Brant
Open Data” and checked date 2026-10-14. Explore offers independent map
layer toggles; geometry loads only when its layer is enabled. Source links
and checked dates appear below the map. Notices remain a separate layer.
No live access, parking availability or river safety status is asserted.

The visiting guide includes “Plan your stay” as an official link-out to
https://www.brant.ca/Visit (County of Brant “Visit and Discover Brant”,
checked 2026-10-14). No accommodation business names are added.

The Friday weekend email card is intentionally omitted because email is
not enabled. No signup is included.

The night-market guarded migration remains unexecuted. No notices,
Supabase writes, publishing, deployment or merges are part of this work.

Validation is limited to Vitest, lint and typecheck. Servers, builds and
Playwright are run by the repository owner outside this sandbox.

## QA follow-up

The sample-data notice uses an aside landmark. Explore uses a 28px mobile
heading and one scrollable chip row without the old List/Map card or area
bar. Today keeps a 2:1 desktop dashboard, with an Explore shortcut grid in
the right column; search follows the dashboard.

Root metadata already contained a factual description. HTML metadata
streaming is disabled through `htmlLimitedBots` so HTML-only checks see
that description in the head. Referenced favicon/manifest icons exist;
middleware now explicitly permits them and the GeoJSON/manifest assets.
No missing font file reference was found in the layout (Inter uses
next/font). The QA console messages do not identify request URLs, so their
exact causes still need browser verification.

Playwright now defaults to a production build followed by `next start`,
with a five-minute startup timeout, or uses `PLAYWRIGHT_BASE_URL` when set.
Production intentionally does not enable the development preview fixtures;
data-dependent tests require a controlled populated test database. No
production sample-data bypass was introduced. Removed Today shelves and
visit-history UI assertions are replaced with dashboard/search/empty-state
checks; personal notice filters and area controls are tested on `/app/map`.
