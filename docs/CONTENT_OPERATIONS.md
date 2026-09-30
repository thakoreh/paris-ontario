# Keeping Paris Pulse current

Prepared 2026-09-30. This is an operating proposal, not evidence that new jobs, integrations, notifications or live content have been activated. Source destinations below were checked through public official pages on that date; check the original item again before publication.

## Recommendation

Keep the narrow County road-construction publisher and add a small, explicit human editorial routine. Start with one owner and one backup, daily notice review and twice-weekly event curation. Do not try to fill every category automatically or promise a minimum number of posts. A successful source check with nothing new is a valid result.

## What exists, and what still needs verification

The repository contains `scripts/official_publisher.py`, its cron wrapper, `official_watchdog.py`, reviewer context and tests. `docs/automated-editorial-workflow.md` reports a publisher every four hours, hourly script-only watchdog, daily independent reviewer and incident advisor on the existing Hermes host. **Those are documented operating arrangements, not a live scheduler audit performed for this plan.** Confirm enabled jobs, deployed script revision, last successful execution, production readback and working notification destination before promising the cadence.

The publisher discovers County RSS items and checks original article pages. Its baseline scope is Paris-specific Road Construction news published within five days, at most two new County records per UTC day, informational severity, no invented coordinates and a maximum 72-hour expiry. It rejects sensitive topics and does not overwrite an existing official URL. Source excerpts are deterministic, not generated civic claims. Check current code/tests for the exact gates after reliability changes.

The web app already has editorial notices/deadlines/source screens, verification fields, duplicate merging and expiry filtering. Other source adapters are interfaces, not configured general-purpose collectors. README statements that no fetch runner exists predate the external publisher; use the dedicated automation document and verify runtime rather than assuming either account is current.

The independent reviewer is after-the-fact checking, not human approval before each automatic publication. An ingestion heartbeat proves execution; it does not prove all Paris content or previously published items were rechecked. Email preferences and reminders do not establish a working dispatch service. No outbound email expansion is part of this plan.

## Source list and proposed review cadence

All cadences here are editorial targets, not newly installed schedules. Use `America/Toronto` for event times and working routines; retain explicit UTC timestamps in audit records. The publisher's UTC daily cap is separate from a Toronto calendar day.

| Source | Use | Proposed routine |
| --- | --- | --- |
| [County news](https://www.brant.ca/news/) and the existing RSS endpoint documented in the publisher | Municipal notices, service changes and road news | Keep existing four-hour narrow publisher after runtime verification; editor reviews broader relevant items each weekday |
| [Construction in Brant](https://www.brant.ca/roads-parking-and-public-transit/construction-in-brant/) and [bridge/road closures](https://www.brant.ca/roads-parking-and-public-transit/construction-in-brant/bridge-and-road-construction-and-closures/) | Confirm ongoing projects and changed/end dates, including older articles excluded by the five-day gate | Daily while carrying active road notices; follow the County's linked Municipal511 tool for current conditions |
| [Active planning applications](https://www.brant.ca/planning-and-development/active-applications/) and [EngageBrant](https://engagebrant.ca/) | Consultation opportunities and exact submission deadlines | Twice weekly; recheck the original project within one working day of a displayed deadline. EngageBrant is linked by the County construction page; project text was not extractable in this research |
| [County recreation](https://www.brant.ca/recreation-and-parks/) | Program registration and resident activities | Monday and Thursday; verify the actual program page, availability, venue and dates |
| [Library website](https://www.brantlibrary.ca/en/index.aspx), which links its [official calendar](https://brant-ca.libcal.com/calendar/public) | Paris-branch programs and local activities | Monday and Thursday, covering the next two weeks; recheck imminent events. Calendar returned HTTP 429 during research, so no current event details were verified |
| [County special-events guidance](https://www.brant.ca/applications-licences-and-permits/special-events-permit/special-events/) links [the County calendar](https://events.brant.ca/) | Discover local events, then confirm with the original organizer | Monday and Thursday. Calendar returned HTTP 502 during research; verify access before treating it as a working integration |
| [GRCA flood messages](https://www.grandriver.ca/news/categories/flood-messages/) | Direct authoritative safety reference | Keep as an official link-out; check link health weekly. Human verification is required for any dated summary; no unattended safety publishing or claim of continuous monitoring |

County-wide material belongs in Paris Pulse only when relevant to Paris residents. A municipal event-calendar submission is a discovery lead, not proof that every organizer claim is official. Do not infer Paris, Ontario from the word Paris alone. Other local organizations can be added later after their original event pages, ownership, access terms and Paris relevance are verified; they do not need new automated adapters on day one.

## Editorial routine and ownership

Assign an editorial owner and backup before adopting this routine; this document does not assign someone without agreement. The technical operator owns runner health and incidents. One person may cover both roles initially.

- **Each weekday, 10–15 minutes:** Check failures and held items, official County changes, active notices approaching expiry, corrections inbox and stale sources. Reopen the source for every changed fact. Record “checked, no relevant change” when appropriate without changing notice verification dates that were not actually reviewed.
- **Monday/Thursday, 15–20 minutes:** Curate useful events and registration deadlines from the official sources above. Recheck events due in the next 48 hours for cancellation, changed venue or registration requirements. Weekend coverage must have an agreed owner; otherwise do not promise same-day weekend updates.
- **Weekly, about 20 minutes:** Check five live source/detail pairs, mobile feed and empty states, stale sources, deadlines, duplicates and correction resolution. Review upcoming two-week coverage and any repeated parser holds.
- **Monthly, about 30 minutes plus incidents:** Check scheduler deployment revision, notification delivery, source destinations and access rules; remove unusable sources and test recovery after host downtime.

Budget roughly 1.5–2.5 hours per normal week at low volume, plus incidents; this is a planning estimate, not measured workload. Record actual effort for two weeks. If the queue exceeds capacity, reduce covered sources or add an editor rather than relaxing verification.

## Publication, expiry and corrections

1. Capture exact original URL, source date, retrieval/review time, locality, category, factual summary and applicable start/end/expiry. Store the event timezone and distinguish an event date from its registration deadline. Missing or ambiguous facts stay in needs-review.
2. Preserve source meaning and qualifications. Do not invent availability, dates, restoration estimates, precise locations or safety instructions. Link readers to the original. Keep summaries brief; review source reuse permissions before enabling a new collector.
3. Search exact canonical source URL/external ID, then compare title, venue, date and affected area. Merge genuine duplicates through the existing editor workflow; do not merge recurring events with distinct dates.
4. Check every active item due to expire before simply extending it. Events leave active feeds after the recorded end; deadlines after their deadline. If a closure continues, an editor must reverify it and record the justified new expiry. The publisher's 72-hour TTL is a freshness limit, not a claim that construction ends then.
5. The automatic same-URL skip prevents overwrites, but also means revised articles and expired rows will not refresh themselves. Daily manual review must cover these. A future changed-source detector should create a review candidate rather than silently rewrite approved content.
6. For a material correction, edit or expire the inaccurate item, preserve source and a dated correction explanation, check connected deadlines and verify the public result. A failed fetch is not evidence that an event was cancelled or a road reopened. Keep the historical detail clearly expired/corrected rather than re-dating it as new.
7. Emergency, flood, outage, health, election and other sensitive information remains outside unattended publication. Direct readers to the responsible authority. Paris Pulse is not an emergency alerting service; the absence of a notice is not an all-clear.

## Freshness monitoring and response

Use existing audit/ingestion records and the source screen first; do not buy a dashboard to start. Keep these separate:

- **Application health:** `/api/health` responds successfully and production uses Supabase. Investigate an application/backend failure immediately when observed.
- **Publisher health:** successful run time, failed/partial run, daily counts, holds and cap reached. Existing watchdog uses an eight-hour heartbeat threshold. Check exact source and backend before retrying; inspect uncertain writes before another insert.
- **Editorial freshness:** source last genuinely checked, active notice last verified, expiring items and oldest review candidate. Proposed target: daily sources checked within one working day, twice-weekly sources within their next scheduled review, and ordinary candidates triaged within one working day. These are targets to adopt, not currently enforced alerts.
- **Content outcomes:** changed originals, stale visible items and unresolved corrections. Zero new publications can be healthy. A full feed can still be stale.

The reliability patch classifies parser failures and missing source fields as failed/partial runs, without advancing success freshness; expected editorial exclusions remain healthy holds. Compare with previous runs before calling zero eligible items an incident. Never advance all source timestamps merely because the job ran or one notice was published.

The existing host's watchdog cannot report its own total host/scheduler outage. The reliability patch includes opt-in independent heartbeat integration and an external app-health setup procedure in [independent monitoring](independent-monitoring.md), delivered to an agreed operator. This requires explicit deployment/service and destination approval; it has not been installed, priced or purchased here. Avoid public credentials or personal data in any heartbeat payload.

## Activation sequence and boundaries

1. Confirm the existing host jobs, deployed revision, production Supabase configuration, editorial login and monitored corrections address. Do not expose service-role credentials, put them in browser code or send them to a model. Existing credentials may already suffice; no new paid service is assumed.
2. Apply and verify the separately reviewed reliability release using its deployment runbook. Updating this document does not deploy code or change the running publisher.
3. Name owner/backup and adopt the daily/twice-weekly review routine. Reverify current production content before treating historical launch seeds as current.
4. After two weeks, choose at most one additional low-risk source for draft-only automation if it actually saves work. Before activation: verify terms/robots/feed availability, add source-specific fixtures and failure tests, bound fetches/rates, preserve source dates and URLs, test dedup/change handling and review dry-run candidates. The blocked calendars above require access verification first.
5. Consider wider auto-publication or outbound digests only as separate reviewed work with explicit authorization, credentials/configuration if required, idempotency, unsubscribe/quiet hours where relevant and delivery monitoring. No new scheduler, subscription, account, service or live publication was created by preparing this plan.

Related repository procedures: [launch runbook](launch-runbook.md) and [automated editorial workflow](automated-editorial-workflow.md).
