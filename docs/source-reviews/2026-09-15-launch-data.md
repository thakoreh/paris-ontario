# Editorial source review — 2026-09-15

**Review timestamp:** 2026-09-15 14:24 EDT
**Scope:** all 11 launch notices and their associated source records.
**Decision:** retain the records below as `verified` for the reviewed snapshot. Re-open every source immediately before production import; this report is evidence of review, not a substitute for launch-day verification.

## Confirmed, active resident information

- Powerline Road lighting work runs from September 14 through the estimated October 12 completion. The County says there are no road or intersection impacts, no detour, and driveway/property access is maintained where possible.[1]
- Willow Street storm-sewer work is scheduled September 15–16, 7 a.m.–5 p.m.; it covers high-pressure cleaning and CCTV inspection of County storm infrastructure.[2]
- County fall-program registration uses the Fall guide activity numbers; residents can register online or in person at the Brant Sports Complex.[3]
- The Downtown Paris Promenade source says removal began September 14 for final Phase 1 Downtown Dig work. The seed wording was changed from future to past tense to match this status.[4]
- Voter registration must be completed by September 15 to receive a Voter Notification Letter by mail; the County lists election day as October 26, 2026.[5]
- County Culture Days runs September 18–October 4, 2026. The seed correctly treats individual Paris activities as separate source-linked events.[6]
- The Paris Branch library source lists the September 30 National Day for Truth and Reconciliation closure and the branch address at 12 William Street.[7]
- Paris Night Market & Fall Fest is listed for September 18, 5–10 p.m., and September 19, 4–10 p.m., at 139 Silver Street.[8]
- The Arabic calligraphy workshop is listed for September 19, 3–5 p.m., at the Islamic Centre of Brant, 143 King Edward Street.[9]
- Audiobook Narration 101 is listed for September 22, 6:30–9 p.m., at Rebel & Royal, 119 Grand River Street.[10]
- The Accessibility Advisory Committee open house is listed for September 22, noon–2 p.m., at County of Brant Council Chambers, 7 Broadway Street West; the source notes a location change from Wilkin Family Community Centre.[11]

## Integrity changes made from this review

- Seed `retrieved_at`, `verified_at`, `last_checked_at`, and `last_success_at` values now preserve the real review timestamp instead of using SQL `now()` at a later import. A delayed production import can no longer make previously reviewed content look freshly verified.
- Added regression coverage that rejects production seed files which use import time as editorial-review time, and requires direct HTTPS URLs in seeded source content.
- No automatic publishing was enabled. Future entries still require an editor to review the original source and explicitly mark the notice `verified`.

## Required next review

- **September 16:** re-open the Willow Street source after the scheduled maintenance window; expire or revise it if work completed or changed.
- **September 17:** re-open Powerline Road, Downtown Dig, and registration sources. Confirm work status and remove the registration item if its resident value has become too generic.
- **September 18–22:** re-open each event source on its event day. Expire a listing as soon as its end time passes or the organiser posts a material change.
- **Before production import:** repeat this exact source review. Do not apply these seeds if any timestamp, location, status, deadline, or original URL has changed.

## Sources

[1] https://www.brant.ca/news/posts/street-lighting-installation-on-powerline-road-in-paris
[2] https://www.brant.ca/news/posts/upcoming-storm-sewer-system-maintenance-on-willow-street-in-paris
[3] https://www.brant.ca/news/posts/registration-for-fall-programs-opens-monday-september-14-2026-at-600-pm
[4] https://www.brant.ca/news/posts/downtown-paris-promenade-update
[5] https://www.brant.ca/council-and-county-administration/elections
[6] https://www.brant.ca/visit-and-discover-brant/arts-culture-and-heritage/culture-days
[7] https://www.brantlibrary.ca/en/your-library/hours-and-locations.aspx
[8] https://www.parisfairgrounds.com/events/paris-night-market---day-2
[9] https://culturedays.ca/en/events/b43a2522-d9dc-491d-a48a-9dee66fc9b47
[10] https://culturedays.ca/en/events/403a6f1e-201e-475a-8004-41fd1e8b9ac0
[11] https://www.brant.ca/news/posts/join-the-accessibility-advisory-committee-for-an-open-house
