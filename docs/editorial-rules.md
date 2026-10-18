# Editorial rules

Only County sources with authority `official` may auto-publish. `official_agency`,
community, aggregators and unknown sources are held. All checks must pass.

| Hold reason | Required to publish |
| --- | --- |
| untrusted_source | Authority is exactly official |
| non_routine_category | Road Construction → construction; Garbage and Recycling → waste |
| non_routine_waste | Waste title/body positively matches routine collection wording and title, body and loose text contain no waste hazard keywords |
| uncertain_locality | Existing Paris locality matcher finds Paris, Ontario; street names and Paris, France do not suffice |
| sensitive_keyword | Nonempty screening text passes the existing BLOCK regex, including all body and loose content |
| parse_failure | Explicit parse_ok=True and valid dates/reference time |
| missing_date | published_at/published or starts_at is present |
| missing_excerpt | Complete source paragraph of 30–400 characters |
| stale_or_future | Source date is between today and five days ago, inclusive |

`decide` accepts an explicit `now` date/datetime for deterministic evaluation.
Missing or invalid evidence holds. The publisher still treats malformed source
structure as errors before evaluating healthy editorial holds. Existing URL,
redirect, independent fetch, title match, daily cap, readback and lock checks remain.

Examples: a recent official Paris paving notice publishes as construction; a
recent official Paris collection notice publishes as waste. A Brantford-only
collection notice is held; a Paris notice mentioning a school is held.

Held items create no new notices by default. `hold_record(row, reasons)` only
builds a row: verification_status=draft and tags_json containing held-for-review
and reason codes. In publish mode only, PARIS_PULSE_WRITE_HELD_DRAFTS=1 opts into
persisting structurally valid editorial holds, with duplicate, cap, source and
readback checks under the existing lock. Parse failures have no draft row.
Dry-run never writes notices, even with this flag; existing local audit logging
is unchanged. Drafts are non-public under published_read RLS.

An editor reviews the source, locality, dates, category and excerpt in the admin,
corrects the draft as needed, and approves it by setting verification_status to
verified. Approval must include reviewing any sensitive-topic hold; it is never
automatic.

Waste requires positive title/body evidence: collection/pickup/pick-up schedule,
scheduled or delayed collection, date change, holiday schedule, drop-off day/event,
yard waste, leaf, bulky item, green bin or blue box. Loose text cannot supply this
positive evidence. Missing evidence is held as `non_routine_waste`.

Waste hazard screening covers title, full body and loose text, using word
boundaries: spill*, toxic, chemical*, contaminat*, leak*, safety, unsafe,
emergency, evacuat*, hazmat, fume*, smoke, explosion, injur*, warning, advisory,
do not, avoid and hazardous. Only the phrase “household hazardous waste” exempts
“hazardous”; a household hazardous waste drop-off event/day can publish, but
any other hazard keyword still holds it. Hazardous spills and hazardous material
incidents are held even when routine collection wording is present. Road
Construction rules are unchanged. All other editorial checks still apply.
