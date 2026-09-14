## Optional sign-in (September 14, 2026)

Residents can personalize `/app`, add places, save/read notices, store reminders and change preferences without an account. Guest data stays in this browser, including when Supabase is configured. Sign-in remains optional through Settings or `/login`; authenticated accounts use Supabase. Guest data is separate and is not automatically imported into an account. Editors still require an authorized login. Clear browser data in Settings removes the guest profile.

# Paris Pulse

**Know what changed around you.** A resident-focused, mobile-first web app launching for Paris, Ontario. This replaces the former tourism/restaurant site.

Public local notices, source transparency, storm/disruption resources, deadline cards and maps work without an account. Residents can save private places, choose interests and a radius, save/read notices, and store alert preferences and reminders. Editors manage notices, deadlines and sources.

## Quick start

Requires Node.js 24 and npm.

```sh
cd /Users/hiren/microsaas-projects/paris-ontario
npm ci
npm run dev
```

Open http://localhost:3000. No credentials are needed for the demo. This implementation's running review server uses port 3017.

**Demo:** Open `/app` and start using it immediately, without an account. Add your own places through `/app/locations/new`. The optional **Explore the demo** action on `/login` adds four sample places. Guest places, preferences, saved notices and reminders persist in this browser's localStorage. Use **Clear browser data** in Settings to remove them. There is no demo password or publicly accessible admin bypass.

All 39 fictional notices and 8 fictional deadlines are individually labelled **Sample data**. Four notices are expired. Demo dates are relative to the request time to keep the interactive preview useful. These dates must never be interpreted as real public notices. Source links on samples reference organizations, not evidence for the fictional items.

## Routes

| Area | Routes |
|---|---|
| Public | `/`, `/today`, `/map`, `/storm`, `/deadlines`, `/events`, `/sources`, `/about`, `/disclaimer` |
| Details | `/notice/[slug]`, `/deadline/[id]` |
| Account | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/onboarding` |
| Personal | `/app`, `/app/feed`, `/app/map`, `/app/locations`, `/app/locations/new`, `/app/alerts`, `/app/deadlines`, `/app/saved`, `/app/settings` |
| Editorial | `/admin`, `/admin/notices`, `/admin/deadlines`, `/admin/sources`, `/admin/review`, `/admin/ingestion` |
| APIs | `/api/admin`, `/api/calendar/[id]` |

The personal map contains the signed-in user's places and radius. Public maps contain only notice positions. Map markers cluster; a corresponding list works without interacting with the map. A complete local-demo onboarding flow is available.

## Architecture

- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn-compatible Button/Slot/CVA conventions, Lucide icons.
- Supabase Auth with cookie sessions and middleware refresh; PostgreSQL with migrations and RLS. Server repository queries return bounded public datasets; the browser fetches private state under the signed-in user's RLS policies.
- Leaflet + OpenStreetMap, lazy loaded. MarkerCluster groups public notice markers. Manual map placement and coordinate entry are the usable location fallback; no geocoding result is invented.
- Zod validates editor/location data. React Hook Form validates auth forms. Typed domain objects are in `src/types`; regenerate database-specific client types with the Supabase CLI as the deployed schema evolves.
- Deterministic Haversine matching, interest/radius/importance filters, urgency ranking, human-readable reasons and deadline scoring. SQL triggers create/update private matches on notice, location, preference and deadline changes. Read/saved flags survive recalculation.
- Editor mutations use a server API plus database authorization. Duplicate merging is transactional. Match previews expose a count, not residents' addresses.
- Notification preferences and deadline reminders persist. Resend-compatible email abstraction, pure digest generation, optional AI transformer with source-preserving fallback. No external email or AI provider is necessary to run the app.
- PWA-style responsive shell, manifest, metadata, sitemap, robots, keyboard focus states, map list fallback, and mobile bottom navigation.

### Directory layout

```text
src/app/                    Route composition, metadata, auth callback, APIs
src/components/             Feed, detail, maps, account, admin, shared UI
src/config/                 Community and source reference configuration
src/data/seed.ts            Labelled fictional dataset and demo places
src/lib/relevance.ts        Geospatial matching, trust, expiry and deadlines
src/lib/validation.ts       Input validation and duplicate heuristics
src/lib/supabase/           Browser and cookie-based server clients
src/lib/ingestion/          Manual/RSS/HTML/JSON adapter contracts
src/lib/email.ts            Digest generator and provider abstraction
src/lib/ai.ts               Source-preserving optional summary fallback
src/lib/analytics.ts        Optional provider; excludes precise location data
supabase/migrations/        Schema, RLS, matching and atomic merge functions
scripts/seed.ts              Supabase seed runner
tests/                     Vitest, PostgreSQL RLS and Playwright tests
```

## Supabase setup

1. Create a Supabase project, or start a local Supabase stack with the official CLI.
2. Copy `.env.example` to `.env.local`, then add the project URL and public anonymous key. Keep the service-role key server-side and never prefix it with `NEXT_PUBLIC_`.
3. Apply both migrations **in filename order**, using the SQL editor or `supabase db push` for a linked project:
   - `supabase/migrations/202609070001_initial.sql`
   - `supabase/migrations/202609070002_matching.sql`
4. Set Auth **Site URL** to the app's origin. Allow redirect URLs `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/callback?next=/reset-password`, and the corresponding production URLs. If reviewing on 3017, add that origin too. Enable email/password auth and configure production SMTP before launch.
5. Seed the community, category interests, 16 source references, sample notices and deadlines:

```sh
node --env-file=.env.local --import tsx scripts/seed.ts
```

Alternatively export the variables in your shell and run `npm run db:seed`.

The seed is idempotent by stable IDs. It contains no real user accounts or private home addresses. Four local sample locations are created by the explicit demo action only. Production residents create their own locations.

### Editor/admin setup

Sign up normally and confirm the email. Through the Supabase SQL editor, promote only the intended account:

```sql
update public.users
set role = 'admin'
where id = '<the verified auth user UUID>';
```

Use `editor` for editorial access without calling it an administrator. Browser signup metadata cannot set roles; ordinary users cannot update the role column. Never deploy a shared admin password. The demo cannot access the editorial API.

### Privacy and RLS

RLS is enabled for every table. Locations, interests, matches, preferences and reminders are owner-only. Editors cannot read residents' precise locations. Auth profile creation always assigns `user`; users can only update their own `full_name` column. Published public notices are public, including past notices on detail pages, but active feeds filter expiry. Drafts and rejected notices are editor-only. Editor RPCs enforce roles again inside PostgreSQL. Internal matching helpers are not executable by anonymous/authenticated clients.

`tests/database.test.ts` executes the migrations in PGlite's actual PostgreSQL engine, with Supabase-compatible `auth.uid()` and roles. It tests database enforcement rather than merely checking a JavaScript ownership helper. This is not a substitute for a final smoke test against your configured Supabase Auth instance.

## Environment

| Variable | Required? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production core | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production core | Public client key; access constrained by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Seed/operator commands | Privileged seed access, never exposed to browsers |
| `NEXT_PUBLIC_APP_URL` | Production deployment | Canonical public origin for metadata/sitemap |
| `RESEND_API_KEY` | Optional | Enables the email provider abstraction |
| `EMAIL_FROM` | With Resend | Verified sender address |
| `OPENAI_API_KEY` | Optional/future | Reserved; no AI network call is enabled by default |
| `CRON_SECRET` | Optional/future | Reserved for a future authenticated scheduler |

With no Supabase configuration, the app enters explicitly labelled local demo mode. With Supabase configured, errors are displayed instead of silently substituting fictional production data. Email fallback returns `not_configured`, never a false delivery success. AI fallback returns original text. Generated summaries, if a provider is supplied, require editorial review.

## Editorial workflow

1. Open `/admin/notices`, create a notice, supply its source, exact original URL, affected area, coordinates where known, and an expiry.
2. Save as draft or needs review. Check the original source before selecting verified.
3. Use verified only for source-checked live content; retain Sample data on anything fictional. Publishing creates private matches through SQL triggers.
4. Create deadline objects in `/admin/deadlines`. Live deadlines need verification to become public; sample deadlines remain labelled.
5. Review the queue for drafts, missing coordinates and possible duplicates. Merge a duplicate into a selected existing target; the duplicate is rejected, related deadlines reassigned and saved/read flags preserved.
6. Use match count to see aggregate reach without exposing private addresses.

Expired/event-ended notices disappear from active views through query and relevance filters, even before an operator changes the status. An editor can change expiry and status to override the lifecycle. Original source text is retained by ingestion normalization.

## Source ingestion

`src/config/sources.ts` contains manual-by-default source definitions for municipal news, construction, public notices, planning, Engage Brant, recreation, transit, BIA, fairgrounds, GRCA, emergency references, GrandBridge/Hydro One outage tools, library and secondary media.

The County construction page, GrandBridge outage map and GRCA flood-message destinations were checked during implementation. Some category references intentionally point to organization homepages; replace those with reviewed exact category/feed URLs before enabling production curation. `last_checked_at` stays empty until a real operator/source check occurs.

- `ManualSourceAdapter`: accepts supplied source text and normalizes it into needs-review notices.
- `RSSSourceAdapter`: requires an approved fetcher and reviewed XML parser.
- `HtmlSourceAdapter`: requires explicit robots/terms review, an approved fetcher and a source-specific parser.
- `JsonApiSourceAdapter`: requires an approved fetcher and schema/parser.
- `ingest()`: returns successful/failed records and an ingestion-run summary; the operator runner must persist those results.

No automated fetch runner, aggressive scraper, private social-group ingestion, or fabricated outage integration is enabled. The ingestion screen tells editors which sources are manual. No meaningless retry button is shown for sources without configured ingestion.

## Email, reminders, analytics and monetization

Daily email is the default saved preference. The digest generator includes Pulse detail URLs and original source URLs, omits expired notices and fictional samples, and uses a local or Resend provider. Instant-alert eligibility only permits verified official/agency information and excludes event discovery and sample alerts.

**Scheduling is intentionally not enabled**: saving a reminder or email preference does not promise actual delivery. The UI explains this. Implement an authenticated, idempotent scheduler with quiet hours, unsubscribe handling, delivery tracking and retries before enabling outbound digests. No emails were sent during implementation.

Analytics uses an optional provider interface and public event IDs. Never pass addresses or coordinates. Billing and sponsored placement are not enabled. Keep future sponsorship separate from safety, municipal, road, planning and storm ranking.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

Vitest covers Haversine, relevance, deadlines, expiry, interests, authorization, actual RLS, source URL checks, duplicate detection, storm eligibility, AI fallback, email fallback and manual ingestion. Playwright runs desktop and mobile flows, plus automated WCAG A/AA checks on key public routes. Tests never send email or require a production service key.

## Latest verified results

Validated on September 7, 2026: lint passed; typecheck passed; 32 Vitest/PostgreSQL tests passed; production build passed; all 10 Playwright desktop/mobile tests passed against the production server; automated WCAG A/AA checks passed on four key routes; npm audit reported zero vulnerabilities.

To test a running production build separately from the development cache:

```sh
npm run build
npm run start -- --port 3017
# In a second terminal:
PLAYWRIGHT_BASE_URL=http://localhost:3017 npm run test:e2e
```

Do not run `next build` while browser tests are using `next dev` in the same checkout: they share `.next`.

## Deployment

Deploy as a standard **Next.js application on Vercel**, using Node 24, `npm ci` and `npm run build`. Add environment variables and the actual public origin, apply migrations, seed/reference-configure sources, and configure Auth redirect URLs. The old GitHub Pages static-export workflow has been replaced with validation CI because authenticated server routes require a server runtime.

Do not reuse the tourism site's `/paris-ontario` asset prefix. Routes now live at the deployment root. No public deployment has been performed by this implementation.

Before resident launch: verify signup/confirmation/password reset with the configured Supabase project, curate real verified notices, confirm source destinations and provider service area, establish a privacy/account-deletion support contact, and validate deployment environment settings. Keep the visible demo labelling until sample content is replaced.

## Known limitations

- No external credentials were supplied. Production Supabase Auth email delivery and a deployed Supabase instance have not been exercised; SQL policies and mutations were tested locally in PostgreSQL.
- Demo content is fictional and rolling-dated. Production usefulness depends on regular human curation.
- Geocoding is not connected; manual map/coordinate selection is fully functional.
- Source-specific automatic ingestion, retries, source-health probing and outbound notification scheduling are extension points, not active integrations.
- Public repository responses currently cap notices/deadlines at 100 and editorial lists at 200. The UI progressively reveals results. Add database cursor pagination and server-side personalized ranking before large-scale multi-community use.
- Multi-area notice storage exists in the schema; the current editor, map and Haversine feed use the primary notice point/area.
- The SQL matcher uses coordinate/city fallback; client reasons additionally support street-text fallback. PostGIS and a shared database ranking RPC should replace duplicated matching implementations as the product scales.
- No offline data cache or push delivery is installed. The app has a manifest and standalone/mobile layout.
- Calendar export works; reminders persist but do not yet dispatch. Quiet hours are stored for the future scheduler.
- Account deletion is operator-assisted, not an in-app self-service workflow. Supply a real support contact before launch.
- No AI-generated factual data, billing, sponsored placements, social features or native apps.

## Roadmap

**Phase 2:** reviewed live adapters; idempotent email scheduling with unsubscribe and quiet hours; address search; database pagination; PostGIS; push notifications; reviewed AI weekly summaries.

**Phase 3:** Property & Permit Copilot, planning/property professional tier, family-provider availability and clearly labelled downtown merchant promotions.

**Phase 4:** configurable expansion to Brantford, St. George, Burford, Ayr, Cambridge-area communities and other Ontario municipalities.

## Disclaimer

Information can change. Verify important details with the original source. Paris Pulse is not an official County of Brant service.

**For emergencies, call 911 and follow official emergency authorities.**
