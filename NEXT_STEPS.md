# Paris Pulse review and deployment handoff

## Status and scope

Continue the existing **draft PR #2**, branch `fix/paris-resident-experience`, off `main` at `cbc1d72a3251c3d4dc7961e384be1c7c7f574be4`. Do not merge or deploy automatically. The user's independent deployment reviewer owns those steps.

Included:
- A neighbourhood-first Today dashboard, disjoint new/road-service/event/opening/community cards, linked sources, a useful map, and Today / Explore / Share / My area navigation
- A private, persistent area and radius shared by Today, feed and map; All Paris is a reversible browsing scope and does not change push opt-in or delivery settings
- New-since-last-visit based on a browser-local, identity-scoped visit checkpoint and actual publication/source-update timestamps, never retrieval/verification time; honest first-visit, storage-unavailable and empty states
- A single area → real preview → interests → optional browser notifications setup; guest data stays local and is not automatically imported at sign-in
- Anonymous source-backed, coarse-area contributions into a **private pending queue**, plus an authenticated editor checklist. A ready review is an editorial handoff only: no publication, public community post or notification is created
- Personalized opted-in browser push from the earlier review patch, unchanged in purpose: saved places, radius, strict interests, minimum importance, Toronto quiet hours, device opt-out and atomic deduplication
- The dated, review-only content proposal in `docs/content-review/2026-10-02-paris-refresh.json`: 15 proposed notices, 3 existing-notice actions, 1 exact-time deadline and 4 date-only actions

No production state, account, permission, credential or content was changed. No production migration was executed. No live notification was sent. No merge or deployment was performed. A newly published notice still does not automatically send an alert.

## Local and remote verification

Local combined checks passed: ESLint, TypeScript, 360 Vitest tests across 41 files, and 31 Python publisher tests. The final production build and exact-head desktop/mobile CI results are recorded in the PR description. The final PR description records tests and CI against its exact remote head. Re-run after any further changes:

```sh
npm ci
npm run lint
npm run typecheck
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
npm run build
npm audit
npm audit --omit=dev
npm run test:e2e
```

This constrained local executor intermittently closed parallel Vitest worker IPC channels. The supported lower-resource verification uses `npm test -- --pool=threads --maxWorkers=1 --no-file-parallelism`; this changes scheduling, not test selection. CI runs the standard command.

Local Chromium previously failed before assertions with socket/process-singleton EPERM; one approved retry had the same result. The cloud browser could not open localhost (`ERR_BLOCKED_BY_CLIENT`). No security settings or browser restrictions were bypassed. Browser acceptance therefore relies on the GitHub Actions desktop/mobile run for the exact final head, with preview screenshots retained as an artifact before production route-status tests clear output. Inspect both full desktop and 320px mobile images. Preview fixtures are isolated from production and are not proof of live accounts or real device delivery.

The dependency lockfile is unchanged. The current audit reports **14 affected packages (9 high, 5 moderate)**, including propagated lint-tool dependencies; production-only reports **3 moderate affected packages** (`@hookform/resolvers`, `ajv`, `fast-uri`) from the `fast-uri` advisory. Vitest/mock tooling also has a moderate advisory. The clean GitHub Actions `npm ci` install reports 3 vulnerabilities (1 high, 2 moderate), a different environment/audit snapshot from the local audit; neither result is a clean scan. Audit is not passing. Prior counts in the original PR were older audit results; use the current run rather than claiming a clean dependency scan. No unrelated package upgrades are bundled.

## Migration and configuration gates

Existing core/matching and `202609150003_web_push.sql` migrations remain prerequisites for personalized push. The new UI works with intake disabled; no new variable is needed for browsing.

The new migration `supabase/migrations/202610020005_private_community_submissions.sql` is **review-only until the deployment reviewer approves and applies it**. Review it against a production-like database first. It creates private intake and rate-counter tables, explicit grants/RLS, atomic intake and readiness RPCs, and an immutable evidence/terminal-review trigger. Anonymous/authenticated browser roles cannot read or write these tables or call intake RPCs. Only the server's service-role connection can use intake; editorial reads/updates additionally require the current authenticated database role to be editor/admin. No public view or notification hook exists.

Keep `COMMUNITY_SUBMISSIONS_ENABLED=false` until all are checked:
1. Existing Supabase URL/public key and server-only service-role key are correctly configured; migration and service-role privileges are verified
2. `NEXT_PUBLIC_APP_URL` exactly matches the HTTPS canonical origin used by residents and editors. Origin checks fail closed; review environments need their own authorized origin configuration
3. `SUBMISSION_TRUSTED_IP_HEADER` is `x-real-ip` or `cf-connecting-ip`, and the trusted ingress **overwrites** this header. Direct requests bypassing that proxy must be blocked. Do not select `x-forwarded-for` or trust a client-supplied header
4. An operator supplies a deployment-specific `SUBMISSION_RATE_LIMIT_SALT` of at least 32 characters using the authorized secret-management process. Do not generate, expose or commit credentials during code review
5. A monitored editorial owner, response expectations, privacy/retention policy and support contact are established. Submissions have no automatic purge; do not enable an unattended indefinite collection queue
6. A controlled staging test proves readiness, pending intake, source URL/body validation, origin rejection, server-side rate limits, unauthorized access denial, review concurrency and no automatic public/push writes

Intake limits are 3 per network fingerprint/hour, 10/day and 100 globally/hour, using fixed UTC windows and one atomic transaction. IPv6 is bucketed by /64 and IPv4-mapped forms share a bucket. The fingerprint is a keyed hash, not a raw address, and is stored only on rate counters, not contributions. Cleanup removes expired counter windows in bounded batches during new intake; it is not a scheduled deletion guarantee. Body input is bounded while streaming. Source pages are not fetched server-side. Contact details and precise resident coordinates are not requested. Rate limits reduce abuse but are not a replacement for upstream traffic limits or editorial review.

## Personalized push compatibility

Existing valid `alert_preferences.push_enabled` and unique global preference rows are reused; subscribers with Push off remain off. Account preference and each device require deliberate opt-in. Do not migrate existing users to on.

Existing authorized VAPID public/private keys and subject, canonical HTTPS origin and Supabase configuration remain prerequisites. Keep service-role and VAPID private material server-only.

No valid same-community saved place means no delivery. Interests are a strict delivery filter. Positive-radius delivery requires a valid notice point and uses radius plus affected radius. Unmapped notices require explicit All Paris radius (0), while still requiring a valid same-community saved place and matching category. Do not invent coordinates to increase reach.

Quiet hours use America/Toronto including DST: start inclusive, end exclusive, equal endpoints all-day quiet, invalid/incomplete pairs fail closed. Skips are not queued. Only an editor's explicit batch request dispatches, maximum 20 eligible subscriptions. New recipients precede failed retries; retries remain manual. Pending ledger records are never blindly retried because the provider may already have accepted them.

Feed interests prioritize ranking; browser push strictly filters them. The visible All Paris browsing toggle temporarily explores wider results without altering notification settings. The interface states this distinction.

## Required acceptance checks before activation

- Verify signup → actual confirmation email → callback → login → refresh/session persistence → sign-out with an authorized disposable account. SMTP/provider setup was not accessible in this review. `scripts/verify-auth-push.mjs` creates a preconfirmed user and does not establish email confirmation works; do not run without account/send authority
- Verify guest saved places, preferences, visit history, bookmarked notices, browser storage denial and clear-data behavior separately. Sign-in does not transfer local guest preferences. Authenticated map context remains private to that resident
- Use two authorized staging accounts/devices with near/far places and different interests. Prove matching delivery and suppression for no-place, missing coordinates, wrong category, minimum importance, master off and quiet hours. Use synthetic nonpublic QA notices or an explicitly approved test notice, never a production broadcast as a test
- Verify deliberate Chrome permission, denied permission, reload, subscription ownership, device opt-out, account master-off, sign-out and re-enable. Prove provider acceptance actually appears on the intended device and opens the safe detail URL; test closed tab, OS Focus restrictions and successive notices
- Repeat and concurrently dispatch a notice; verify one accepted delivery per notice/subscription. Test pagination (>20 recipients, >100 subscriptions), expired endpoints, failed retries and ambiguous pending ledger records. No precise saved coordinates/addresses may enter responses, logs or push payloads
- Inspect desktop/mobile, 320px layouts, 200% zoom, keyboard focus, menu Escape/Back, map/list selection, route changes, repeated submissions, source/detail links and editor flows. Passing mocked browser tests does not establish real external service behavior
- Run the new migration in controlled staging and independently review grants, privacy, rate control, immutability and rollback. The public submission form must remain honestly unavailable before configuration is ready
- Resolve dependency audit findings and any CI/review failures under a separate reviewed dependency change as needed before production rollout

## Dated editorial refresh

The JSON is **not a seed script or live import**. Its bytes preserve the October 2 research package and real verification timestamps. Reopen each source immediately before publication, especially October 2 cutoffs/paving, October 3–4 events, uncertain completion dates and availability. Do not advance timestamps without rechecking or invent times for date-only actions. A source announcement does not establish on-the-ground conditions.

Use the authorized editor workflow, match exact source URLs/slugs, preserve existing IDs, select real source records and review expiry. Structured event fields are not all accepted by the existing editor schema; map them explicitly with reviewed tooling. Do not run `db:seed` or blindly apply the package. Publishing/importing remains a distinct decision from notification sending.

## Rollback

First disable `COMMUNITY_SUBMISSIONS_ENABLED` if intake is problematic. Preserve private submissions and review evidence; do not drop tables or delete submissions as a routine application rollback. The older application safely ignores the additive private tables. Any removal/purge requires a separate retention/backup decision.

Before reverting push code, stop editorial sends and preserve opt-outs and delivery ledger. Never restore the old community-wide sender while delivery is enabled. Deploy a known-good application only through the authorized deployment workflow with outgoing push disabled until reviewed. Do not reset ledger rows to force retries. No content import needs reversal because this branch imported nothing.
