# Paris Pulse launch and freshness Implementation Plan

> **For Hermes:** Execute the launch-critical tasks first. Do not present sample content as a live civic feed.

**Goal:** Launch Paris Pulse as a safe, useful Paris, Ontario information service with a source-first publishing workflow that keeps residents informed without publishing unverified claims.

**Architecture:** The Next.js site runs on Coolify. Supabase is the system of record for reviewed notices, deadlines, sources, accounts, and review history. Official sources feed a review queue; only `verification_status = verified` content reaches the public feed. Until Supabase is connected and populated, the public site stays explicitly labelled as a preview with sample content.

**Tech stack:** Next.js 15, TypeScript, Supabase Auth/Postgres/RLS, Coolify, GitHub Actions, official public sources.

---

## Launch-hour tasks

### Task 1: Preserve the current rewrite in Git

**Objective:** Make the reviewed local source of truth reproducible before deployment.

**Files:**
- Commit: all intentional project files, including `supabase/`, `tests/`, and `docs/plans/`

**Steps:**
1. Verify lint, typecheck, unit tests, and production build.
2. Confirm `.env*` secrets are ignored and `.env.example` contains placeholders only.
3. Commit the complete rewrite on `main`.
4. Pull with rebase, push, and verify the remote commit.

**Verification:** `npm run lint && npm run typecheck && npm test && npm run build`; clean `git status`; `git rev-parse HEAD = origin/main`.

### Task 2: Add launch safety and operational controls

**Objective:** Give Coolify a truthful health signal and baseline browser hardening.

**Files:**
- Create: `src/app/api/health/route.ts`
- Modify: `next.config.ts`
- Create: `.dockerignore`

**Steps:**
1. Return a small health JSON response that identifies whether the data backend is configured without exposing any secret or URL.
2. Add standalone output and standard security headers.
3. Keep source maps, secrets, local builds, and node_modules out of a deployment build context.
4. Test the built app with `next start`; probe `/`, `/api/health`, `robots.txt`, and `sitemap.xml`.

**Verification:** HTTP 200 on health; headers include frame, MIME, referrer, and permissions protections; no runtime exception without Supabase configured.

### Task 3: Deploy a transparent first release

**Objective:** Publish the service from maintained GitHub source to the second Coolify server.

**Files:**
- Coolify application configuration only

**Steps:**
1. Use a dedicated GitHub read-only deploy key and Coolify private key.
2. Create a Next.js/Nixpacks app with `npm ci`, `npm run build`, `npm run start`, `/api/health`, 768 MB memory cap, and auto-deploy enabled.
3. Set `NEXT_PUBLIC_APP_URL` to the assigned HTTPS domain.
4. Do not set fabricated Supabase, Resend, OpenAI, or cron values.
5. Verify rendered homepage, health, source links, and consent/privacy copy.

**Verification:** HTTPS home and health return 200; Docker container is healthy; generated domain points at the new host; a GitHub push produces a deploy.

## Data that matters to a Paris resident

The home experience must answer: *Can I get to work or school? Is something changing near home? What needs a decision this week? What can we do this weekend?*

Priority order:
1. Road closures, construction access, transit disruptions, flood/outage links.
2. Public consultations, planning applications, registrations, and deadlines.
3. Recreation, library, BIA, and fairgrounds events.
4. Neighbourhood relevance by saved Home/Work/School locations.

Source set for launch:
- County of Brant news, construction, notices, planning, recreation, and transit.
- Municipal511 road closures.
- GRCA flood messages.
- GrandBridge and Hydro One outage tools (link out only; never claim live status without a verified feed).
- County of Brant Public Library, Downtown Paris BIA, and Paris Agricultural Society.

## Regular information workflow

### Task 4: Establish the Supabase production record

**Objective:** Replace sample data with a reviewed, traceable local feed.

**Files:**
- Apply: `supabase/migrations/202609070001_initial.sql`
- Apply: `supabase/migrations/202609070002_matching.sql`
- Configure: Coolify environment variables from `.env.example`

**Steps:**
1. Create/select a production Supabase project and apply both migrations.
2. Create an operator/admin user and verify RLS from a non-admin session.
3. Insert the source definitions and an initial reviewed set of current notices/deadlines, each with original source URL, retrieved timestamp, expiry, and `is_sample = false`.
4. Deploy with public Supabase variables and server-only keys only where required.

**Verification:** Public pages show only verified, non-sample records; `/admin` requires the editor/admin role; every card links to an original source.

### Task 5: Candidate collection, human verification, publication

**Objective:** Keep the site fresh without turning a scraper into an authority.

**Files:**
- Create: `scripts/check-official-sources.ts`
- Create: `.github/workflows/source-watch.yml`
- Modify: `src/config/sources.ts`

**Steps:**
1. Poll only approved official URLs/RSS feeds on a staggered schedule: road/emergency sources every 30–60 minutes, County and event sources every 6 hours, planning/deadline sources daily.
2. Store changes as `pending_review`, never as public verified notices.
3. Require title, source URL, source retrieval time, affected area, expiry, and category before an editor can publish.
4. Deduplicate against existing source URL/title/date; expire dated notices automatically.
5. Send a compact candidate report to the operator; an editor publishes only after opening the original source.

**Verification:** New source change becomes a review candidate; it is absent from public pages until verified; a verified item appears with source and timestamp; expired items disappear from public feed.

### Task 6: Cadence and quality controls

**Objective:** Make freshness measurable and prevent a quiet stale site.

**Cadence:**
- Every weekday morning: review urgent changes and same-day closures.
- Monday: review the next 14 days of deadlines/events.
- Friday: review weekend family/recreation events.
- Monthly: validate all source URLs, remove dead sources, and review categories/resident search terms.

**Freshness SLOs:**
- Urgent road/flood/outage link changes: candidate within 60 minutes.
- County notices and events: candidate within 6 hours.
- Planning and registration deadlines: reviewed at least daily.
- Any public notice without a valid source, retrieval time, and expiry is blocked.

**Launch gate:** This is a production civic-information service only after Task 4 is complete. Before then it is a clearly-labelled preview, not a live local-update feed.
