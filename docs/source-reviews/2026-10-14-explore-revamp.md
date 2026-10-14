# Explore, Council and Today destination review — 2026-10-14

This change adds generic navigation descriptions and official link-outs, not
live conditions, scheduled meetings, election information or business listings.
Existing Cambridge trail and resident-service descriptions retain their original
repository review dates (2026-09-15).

New destinations reviewed against official pages:

- County trail guide (SC Johnson and Watts Pond destinations):
  https://www.brant.ca/recreation-and-parks/outdoor-courts-sports-and-trails/trails/
- GRCA recreation and conditions navigation: https://www.grandriver.ca/
- BIA dining directory, history and directions navigation:
  https://downtownparis.ca/visiting-us/
- BIA events index, already reviewed in `events-fallback.ts`:
  https://downtownparis.ca/events/
- County Visit and Discover Brant (official “Plan your stay” link-out, checked
  2026-10-14): https://www.brant.ca/Visit
- County parking information: https://www.brant.ca/bylaws-and-animal-services/parking/
- County councillors, wards and meeting-calendar navigation:
  https://www.brant.ca/council-and-county-administration/council-and-committees/
- Water and utilities destination: https://www.brant.ca/community-and-support/utilities/
- Environment Canada forecast navigation: https://weather.gc.ca/
- Municipal511 road information: https://www.municipal511.ca/
- Collection schedule reused from `paris-resources.ts`:
  https://www.brant.ca/garbage-and-recycling/garbage-and-recycling-in-brant/garbage-collection-guidelines-and-schedule

No distances, surfaces, hours, prices, parking availability, current river status
or meeting dates are copied into the guides. Meeting config and election config
remain empty. The map uses existing public notice coordinates and toggleable official County
trail, river-access and parking geometry fetched on 2026-10-14. Provenance and
clipping bounds are recorded in `../explore-open-data-review.md` and
`public/data/explore/sources.json`. Geometry is loaded on demand.

The installed Next 15.5.27 package does not contain `dist/docs/`. Version-specific
official metadata, error boundary and lazy-loading guides were consulted:
https://nextjs.org/docs/15/app/api-reference/functions/generate-metadata
https://nextjs.org/docs/15/app/api-reference/file-conventions/error
https://nextjs.org/docs/15/app/guides/lazy-loading
