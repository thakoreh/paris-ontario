# Paris Pulse resident launch runbook

Paris Pulse is a source-linked local-information service for Paris, Ontario. It is not an emergency service, public authority, outage monitor, or replacement for official alerts.

## Non-negotiable launch hold points

Do not open the site to residents until all of these are true:

- `NEXT_PUBLIC_APP_URL=https://parispulse.ca` is configured before the production build; redirect `www.parispulse.ca` to this apex domain.
- Supabase migrations are applied, the reviewed production seed is applied, and no fictional demo rows are published.
- A monitored `NEXT_PUBLIC_SUPPORT_EMAIL` is configured and the contact, privacy and terms pages render it.
- At least one editor has a confirmed account and has completed a real publish/correction/expiry test.
- Auth sign-up, confirmation, password reset, account access and deletion-support flow are tested against production Supabase.
- Every visible record has an exact original-source URL, a clear expiry or end date where appropriate, and a current verification time.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`, and `npm audit` pass.
- The live domain returns HTTPS 200 for `/`, `/today`, `/sources`, `/robots.txt`, `/sitemap.xml` and `/llms.txt`; its canonical URLs and structured data use the production domain.
- Google Search Console is verified and the production sitemap is submitted.

## Initial data load

1. Apply the two SQL migrations in filename order.
2. Apply `supabase/seed/2026-09-14-initial-verified-paris-notices.sql` and `supabase/seed/2026-09-14-verified-paris-data-expansion.sql`.
3. Read the latest `docs/source-reviews/` record, then re-open every linked official page. Expire or edit any item whose details are no longer current; a dated review is evidence, never a substitute for launch-day verification.
4. Confirm every source review time on `/sources` is recent relative to its configured review interval.
5. Never run `npm run db:seed` against production. It creates explicitly fictional local-review data.

## Daily editorial workflow

Perform this at least once each weekday, and more often during active construction, severe weather or service disruption:

1. Review official County of Brant news, road/construction updates, Engage Brant, Municipal511, GrandBridge/Hydro One tools, GRCA flood messages, recreation, library and Downtown Paris sources.
2. Open the original source page. Record only the facts visible there: title, source URL, source date, affected area, start/end/expiry, category and severity.
3. Add a new item as draft or needs review. Do not publish copied social posts, anonymous reports, estimated restoration times or unsourced claims.
4. Compare the summary with the original page, then select **verified** only when it is accurate. Publishing a verified notice updates the source review timestamp.
5. Expire completed events, passed deadlines, ended closures and superseded notices. Do not leave stale items active merely because a source page remains online.
6. Review `/sources`. If a source is marked as needing attention, update its review record only after opening and checking it.
7. For urgent events, direct residents to the original official tool. Do not represent Paris Pulse as live monitoring.

## Weekly quality review

- Open the public feed, events, map, deadlines, storm and sources pages on mobile and desktop.
- Check at least five original links. Correct any change of title, date, area or status.
- Review data with no coordinates, vague expiry, missing source date or duplicate title.
- Review the contact inbox for correction requests and record the resolution in the editorial workspace.
- Run `npm run test:e2e` after material feature changes.

## SEO operating checklist

- Build with the exact HTTPS production `NEXT_PUBLIC_APP_URL`; do not deploy metadata generated from `localhost`.
- Keep canonical URLs single-domain and use HTTPS redirects for all alternate hostnames.
- Keep `/robots.txt`, `/sitemap.xml` and `/llms.txt` public. Do not index `/app`, `/admin`, auth or API routes.
- Publish only source-backed, useful local pages. Avoid thin keyword pages and never fabricate reviews, ratings, events or civic information for search visibility.
- Build durable local authority through consistently updated pages for actual Paris, Ontario resident intent: construction, road closures, official notices, deadlines, local events and disruption resources.
- Check Search Console weekly for indexed pages, crawl errors, query impressions, source pages and unexpected noindex/canonical drift.

## Incident rules

- A report from a resident is a lead, not a publishable fact. Find an official source or label it clearly as unverified and do not make it an alert.
- If a linked source changes materially, edit or expire the Pulse item immediately.
- If the data backend is unavailable, show the unavailable state. Never fall back to fictional content.
- If production email/reminders are not actively monitored and tested, keep them disabled and tell residents not to rely on them.
