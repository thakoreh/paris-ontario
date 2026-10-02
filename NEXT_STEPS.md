# Paris Pulse review and deployment handoff

## Status and scope

This is a review branch off `main` at `cbc1d72a3251c3d4dc7961e384be1c7c7f574be4`. Do not merge or deploy automatically. The user’s deployment reviewer owns those steps.

Included:
- Personalized, explicitly opted-in browser push matching saved locations, radius, selected categories, minimum importance and Toronto quiet hours
- Accurate notification/settings/privacy copy, device opt-out, per-notice/subscription deduplication and distinct browser notification tags
- Resident-first briefing above search, remembered private area label/radius, dated weekend/disruption sections, clearer freshness/empty states, grouped navigation and readable/touch-friendly cards
- An editorial review package with 15 proposed notices, 3 existing-notice actions, 1 exact-time deadline and 4 date-only actions in `docs/content-review/2026-10-02-paris-refresh.json`

Not activated: automatic notification dispatch, email scheduling, anonymous contributions, account creation, SMTP configuration, browser permission grants, content import or live notifications. No production state was changed during this work.

## Delivery contract and migration compatibility

No new database migration or environment variable is required by this patch. Verify the existing core/matching and `202609150003_web_push.sql` migrations are applied. Existing `alert_preferences.push_enabled` and unique global preference rows are reused; old subscriptions with Push off remain off. Residents must deliberately enable their account preference and each device. Do not migrate all existing subscribers to on.

Existing configuration prerequisites (do not create/rotate credentials as part of review): Supabase URL/public key, server-only service-role key, canonical HTTPS origin, VAPID public/private keys and subject. Never expose service-role/VAPID-private material to the browser.

No saved valid same-community place means no delivery. Category selection is a strict filter. Positive-radius delivery requires a valid notice point and uses radius plus affected radius. Notices lacking coordinates are eligible only for explicit All Paris (radius 0), still requiring a same-community saved place and matching category. This conservative choice may reduce delivery until editorial notice locations are verified. Do not invent coordinates to increase reach.

Quiet hours use America/Toronto, including DST. Start is inclusive; end is exclusive. Equal endpoints mean all-day quiet; incomplete/invalid settings block sends. Skipped notices are not queued. Only an editor’s explicit batch request triggers dispatch, with a maximum of 20 eligible subscriptions. A freshly published notice does not auto-send. New recipients are attempted ahead of failed retries; retries remain manual. Pending ledger rows are deliberately not blindly retried because the provider may already have accepted a message. Investigate those rows manually before reconciliation.

## Verification record

Combined local verification: ESLint passed, TypeScript passed, 181 Vitest tests across 35 files passed (including PostgreSQL/RLS, mocked dispatch and SSR UI), 31 Python publisher regression tests passed, and the production build passed on the combined source tree. Browser and audit exceptions are below. The final PR description records remote checks against its exact head. Re-run all after any further changes:

```
npm ci
npm run lint
npm run typecheck
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
npm run build
npm audit
npm run test:e2e
```

The unchanged lockfile currently reports 4 npm audit findings (1 high and 3 moderate). `npm audit --omit=dev` reports 1 moderate `fast-uri` finding; the high `brace-expansion` paths are lint tooling, and Vitest/mock tooling also has a moderate advisory. No dependency upgrades are bundled. Review these findings separately; do not describe audit as passing.

Local browser verification was blocked before Playwright assertions by Chromium socket/process-singleton EPERM. One approved retry had the same result. The supported cloud browser could not open localhost (`ERR_BLOCKED_BY_CLIENT`). These are environmental verification limits, not passing UI tests. Added `push.spec.ts` and `resident-dashboard.spec.ts` tests are included in CI and must run in a supported review environment before merge. Inspect the new dashboard screenshots (`resident-dashboard.png`, `resident-dashboard-320px.png`) from a successful review run; they were not generated locally. No security setting or browser restriction was bypassed.

## Required acceptance checks before production activation

1. Confirm deployed Supabase Auth configuration. Repository release notes report no custom SMTP configured; current provider settings were not available to this review. Test signup → actual confirmation email → callback → login → reload/session persistence → sign-out, using an authorized disposable account. The existing `scripts/verify-auth-push.mjs` creates an already-confirmed user and therefore does not prove signup/confirmation email works. Do not run it without explicit account/send authority.
2. Test guest personalization separately. Guest places/preferences remain in that browser and are not automatically imported into an account. Verify this is clear, and save account places/preferences before enabling push.
3. In a controlled test deployment, use two authorized test accounts/devices with nearby/far-away places and different interests. Verify exactly the eligible device is notified; no-location, category mismatch, minimum importance, Push off and quiet hours all suppress sends. Use only synthetic non-public QA notices or an explicitly approved test notice. Do not broadcast a production notice as a test.
4. Verify explicit Chrome permission flow; denied permission; refresh; subscription ownership; device opt-out; account-wide master off; sign-out; and re-enable. Confirm a provider-accepted message actually appears on the intended device and opens its safe detail URL. Test with app tab closed, OS quiet/focus restrictions and a second notice arriving. Provider acceptance is not proof of real-device delivery.
5. Repeat the same notice and concurrent batch attempts; only one accepted delivery per notice/subscription. Test >20 recipients and >100 subscriptions, expired endpoints, failed retries and ambiguous pending ledger records. Check no precise address/coordinates appear in responses, logs or notification payloads.
6. Run the full desktop/mobile e2e suite, keyboard navigation, 200% zoom, and narrow layouts. Compare login, guest personalization, saved notices, map, source/detail links and editor flows against existing behavior. This branch does not claim every feature is regression-free.
7. Only after review, choose an explicit rollout window and publication/send policy. This branch itself is not permission to merge, deploy or send alerts.

## Editorial refresh handoff

The JSON package is **not a seed script or a live import**. It preserves actual research timestamps and uncertainty. Reopen each source immediately before publication, particularly October 2 registration cutoffs and paving dates, the October 3–4 events, uncertain completion dates and availability. Do not advance verification times without a new check. Date-only actions must not become invented midnight/time-specific deadlines.

Use the authorized editor workflow, match exact source URLs/existing slugs, preserve existing IDs, select actual production source records and review every proposed expiry. Structured event fields are not all accepted by the existing editor schema; map explicitly or use authorized operator tooling after review. Do not run `db:seed` or blindly apply this package. Publishing/importing must not automatically send browser alerts. The source research establishes announcements, not on-the-ground conditions.

## Remaining product work

- Auth confirmation/SMTP and real-device tests above
- A reliable authenticated, idempotent automatic dispatch trigger/queue, retry/backoff, quiet-hour deferral and operational monitoring if automated alerts are desired
- Unified feed/server matching semantics: feed interests currently boost ranking whereas push uses strict category filtering; push deliberately rejects unknown-position notices within a positive radius
- Anonymous suggestions are design-only. Existing community tables require account-linked authors and expose only approved public projections. A new bounded, abuse-resistant anonymous intake, source evidence, geography, review queue and mandatory approval are needed; never auto-publish or auto-notify on submission
- New-business coverage requires a verified source/editorial workflow; no invented live business feed is included

## Rollback

Do not roll back to the former community-wide sender while push delivery is enabled: that would restore the mismatch. First stop editorial push sends and preserve existing opt-outs/delivery ledger. Redeploy the previously known-good application only through the authorized deployment workflow, with outbound push disabled until reviewed. There is no new schema to reverse and no content was imported by this branch. Do not reset ledger rows to force retries.
