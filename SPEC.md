You are a senior full-stack engineer, product designer, data engineer, and startup CTO. Build a complete production-quality MVP from scratch for a web app called **Paris Pulse**, launching for **Paris, Ontario, Canada**.

Do not ask clarifying questions. Make reasonable decisions yourself. Do not stop after scaffolding. Build the working application, run it, test it, fix errors, and leave the repository in a launch-ready state.

# Product

Paris Pulse answers one question:

**“What changed around me that I should care about?”**

It is a hyperlocal situational-awareness product for Paris, Ontario residents.

It is NOT:
- a local newspaper
- a Facebook/community forum
- a generic events directory
- a business directory
- an official County of Brant service

The product combines trusted public information into a personalized local feed based on:
- where the user lives
- their saved locations
- their interests
- distance
- urgency
- recency

Examples of things Paris Pulse should surface:

- Road closures
- Construction and detours
- Downtown Paris access/parking changes
- Storm cleanup information
- Utility/outage information where authoritative sources exist
- Flood/emergency municipal notices
- Planning and development applications
- Public hearings and deadlines
- Recreation registration deadlines
- Pool, arena, splash pad or facility closures
- Family activities
- Local events
- Paris Fair / markets / festivals
- Brant Transit notices
- Waste/service disruptions
- Important County of Brant announcements

Core promise:

**Tell us where you live and what matters to you. Paris Pulse tells you what changed nearby.**

# Tech stack

Use:

- Next.js 15+ App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
  - PostgreSQL
  - Auth
  - Row Level Security
  - Storage only if needed
- Supabase typed client or Prisma, whichever is cleaner
- Leaflet + OpenStreetMap
- Zod
- React Hook Form
- TanStack Query when useful
- Resend-compatible email abstraction
- Vitest and/or Playwright
- Vercel-ready deployment

Build a responsive mobile-first PWA-style web app.

Do not build native Android or iOS apps.

# Critical product principle

Do not fake public-data integrations.

If a public source cannot be reliably automated:
- create an adapter/interface for it
- add it to source configuration
- support manual/admin ingestion
- use sample data
- label sample data clearly

Paris Pulse must remain useful even when all data is manually curated.

Official sources always outrank AI-generated or community-derived information.

# Main users

Primary:
- Paris residents
- commuters
- parents
- homeowners
- seniors and caregivers
- newcomers

Secondary:
- realtors
- contractors
- downtown businesses
- community organizations
- visitors

# Main user flow

A user should be able to:

1. Visit the public site.
2. See a useful “Today in Paris” feed without creating an account.
3. Search or enter their address/postal code.
4. Create an account.
5. Save locations such as:
   - Home
   - Work
   - School
   - Other
6. Choose interests.
7. Choose alert radius:
   - 500 m
   - 1 km
   - 3 km
   - 5 km
   - all Paris
8. Receive a personalized feed.
9. View notices on a map.
10. See why each notice matters to them.
11. Save notices.
12. Mark them read.
13. Open the original authoritative source.
14. Subscribe to email alerts/digests.
15. Change categories, radius and notification preferences.

Example card:

**Grand River Street construction update**

1.3 km from Home

Why you’re seeing this:
- Within your 3 km radius
- Matches Roads & Construction
- Updated today

Source: County of Brant
Last verified: 10:42 AM

# Categories

Support these notice categories:

- roads
- construction
- planning
- recreation
- facility
- event
- transit
- downtown
- public_notice
- waste
- storm
- outage
- emergency
- other

# New high-priority MVP features

The latest product validation shows that two features should be first-class:

## 1. Storm and outage aggregation

During storms or major disruptions, residents may need to check:
- County notices
- Municipal511
- electricity provider outage information
- conservation/flood information

Build a dedicated **Storm & Disruption** experience.

It should:
- surface authoritative storm notices
- show outage-source links when available
- show road/closure notices related to the event
- show flood/conservation links
- clearly distinguish:
  - verified official data
  - linked external outage tools
  - unavailable information

Do not fabricate outage status.

Paris Pulse is not an emergency service.

Always display:
**For emergencies, call 911 and follow official emergency authorities.**

## 2. Deadline cards

Many useful local items are deadline-driven.

Examples:
- recreation registration opens
- public hearing submissions close
- senior membership registration
- event registration
- public consultation deadlines

Create dedicated deadline objects/cards.

Deadline cards should show:
- title
- due/opening time
- countdown
- category
- related location
- official source
- add-to-calendar action
- reminder action

The dashboard should contain:
**Deadlines coming up**

# Data model

Create a robust schema.

## users

- id
- email
- full_name
- role
- created_at
- updated_at

Roles:
- user
- editor
- admin

## communities

Design for future expansion beyond Paris.

Fields:
- id
- slug
- name
- province
- country
- latitude
- longitude
- default_radius_km
- active

Seed:
- Paris, Ontario

Do not hardcode Paris-specific assumptions throughout the application.

## locations

- id
- user_id
- community_id
- label
- address_line
- city
- province
- postal_code
- latitude
- longitude
- location_type
- is_primary
- created_at
- updated_at

location_type:
- home
- work
- school
- other

## interests

- id
- slug
- name
- category
- description
- active

## user_interests

- user_id
- interest_id

## official_sources

- id
- community_id optional
- name
- organization
- source_type
- url
- feed_url optional
- description
- authority_level
- ingestion_type
- ingestion_enabled
- refresh_interval_minutes
- last_checked_at
- last_success_at
- active
- created_at
- updated_at

authority_level:
- official
- official_agency
- trusted_local_org
- trusted_media
- community_signal

ingestion_type:
- manual
- rss
- html
- api
- open_data

## notices

- id
- community_id
- source_id
- external_id optional
- title
- slug
- summary
- body optional
- category
- severity
- official_url
- published_at
- source_updated_at optional
- retrieved_at
- verified_at optional
- start_at optional
- end_at optional
- expires_at optional
- address_text optional
- latitude optional
- longitude optional
- affected_radius_km optional
- affected_area_text optional
- city
- tags_json
- verification_status
- confidence_score
- is_sample
- created_at
- updated_at

severity:
- info
- useful
- important
- urgent

verification_status:
- draft
- needs_review
- verified
- expired
- rejected

## notice_locations

Support notices affecting more than one location.

- id
- notice_id
- latitude
- longitude
- radius_km
- label

## deadlines

- id
- notice_id optional
- community_id
- title
- description
- category
- starts_at optional
- deadline_at
- official_url
- latitude optional
- longitude optional
- source_id
- verified_at optional
- is_sample
- created_at

## user_notice_matches

- id
- user_id
- notice_id
- location_id optional
- relevance_score
- distance_km optional
- match_reasons_json
- created_at
- read_at optional
- saved_at optional
- dismissed_at optional

## alert_preferences

- id
- user_id
- location_id optional
- categories_json
- radius_km
- minimum_severity
- instant_enabled
- daily_digest_enabled
- weekly_digest_enabled
- deadline_reminders_enabled
- email_enabled
- push_enabled
- quiet_hours_start optional
- quiet_hours_end optional
- created_at
- updated_at

## digest_runs

- id
- user_id
- digest_type
- generated_at
- notice_ids_json
- deadline_ids_json
- delivery_status

## ingestion_runs

- id
- source_id
- started_at
- completed_at
- status
- records_found
- records_created
- records_updated
- records_failed
- error_message optional

# Relevance engine

Build deterministic relevance scoring.

Geographic score:
- <500 m: +50
- <1 km: +40
- <3 km: +30
- <5 km: +20
- Paris-wide: +10

Other:
- interest match: +25
- saved location match: +20
- important: +20
- urgent: +30
- very recent: +10
- deadline within 24 hours: +20
- deadline within 7 days: +10
- expired: excluded

Cap normalized score at 100.

User-facing explanation examples:
- “850 m from Home”
- “Matches Planning & Development”
- “Affects all of Paris”
- “Registration opens tomorrow”
- “Near Work”
- “Updated within the last 2 hours”

# Distance logic

Use Haversine for MVP.

Create a reusable geospatial service.

If a notice has no coordinates:
fallback to:
- city match
- street-name match
- affected-area text
- known Paris location keywords

Architecture should allow PostGIS later.

# Public routes

## `/`

Homepage.

Hero:

**Know what changed around you.**

Subheading:

**Roads, construction, development, recreation, events and important local updates for Paris, Ontario — personalized to where you live.**

CTA:
- Check what changed near me
- See today in Paris

Sections:
- Important today
- Interactive map preview
- Upcoming deadlines
- How it works
- Categories
- Source transparency
- Email signup
- Disclaimer

## `/today`

Public Paris-wide feed.

Sections:
- Important today
- Roads & construction
- Storm & disruptions
- Planning
- Family & recreation
- Events
- Public notices

Filters:
- Today
- This week
- Category
- Importance

## `/storm`

Dedicated storm/disruption dashboard.

Display:
- official storm notices
- road closures
- Municipal511 link
- official outage provider links
- GRCA/flood information
- municipal emergency information
- active disruption notices

Never claim outage status without authoritative data.

## `/deadlines`

Upcoming deadlines.

Sections:
- Today
- Next 7 days
- This month

Allow:
- calendar export
- reminder
- category filtering

## `/map`

Verified public notices on map.

Cluster markers.

Map/list switch.

Filters.

## `/events`

Events and community activities.

Filters:
- Today
- Weekend
- This week
- Family
- Free
- Downtown

Events are a feature, not the central product.

## `/sources`

Source-transparency page.

Show:
- name
- organization
- authority
- type
- last checked
- original link

## `/about`

Explain mission and independence.

## `/disclaimer`

Clear product and emergency disclaimer.

# Authentication

Build:
- `/login`
- `/signup`
- `/forgot-password`

Use Supabase Auth.

# User routes

## `/app`

Personal dashboard.

Sections:

### Needs attention

Highest relevance important notices.

### What changed near Home

Personalized cards.

### Deadlines coming up

Registration/deadline cards.

### Storm & disruptions

Only visible when relevant active items exist.

### This week in Paris

Broader local items.

### Nearby map

Map preview.

## `/app/feed`

Full personalized feed.

Filters:
- Location
- Category
- Distance
- Importance
- Unread
- Saved
- Date

Sort:
- Relevant
- Newest
- Closest

## `/app/map`

Personal map showing:
- saved locations
- notices
- selected radius

## `/app/locations`

Manage saved locations.

## `/app/locations/new`

Add location.

Allow manual map placement if geocoding fails.

## `/app/alerts`

Notification preferences.

Categories:
- Roads
- Construction
- Planning
- Family & recreation
- Events
- Transit
- Downtown
- Municipal notices
- Storm/outage
- Emergency

Settings:
- Radius
- Instant
- Daily digest
- Weekly digest
- Deadline reminders
- Email
- Push

## `/app/deadlines`

Personalized upcoming deadlines.

## `/app/saved`

Saved notices.

## `/app/settings`

Account
Locations
Interests
Notifications
Privacy

# Notice page

Route:
`/notice/[slug]`

Show:
- Title
- Category
- Severity
- Summary
- Official source
- Published
- Last verified
- Map
- Relevant dates
- Affected area
- Why this matters
- Original source button
- Share button

For logged-in users:
**Why you’re seeing this**

Example:
- 1.2 km from Home
- Matches Construction
- Updated today

Always display:

**Information can change. Verify important details with the original source. Paris Pulse is not an official County of Brant service.**

# Deadline detail

Route:
`/deadline/[id-or-slug]`

Show:
- deadline
- countdown
- what action is required
- source
- location
- add to calendar
- reminder
- related notice

# Admin CMS

Build an actual usable admin experience.

## `/admin`

Metrics:
- Active verified notices
- Needs review
- Expiring soon
- Deadlines this week
- Source health
- Ingestion health
- Users
- Recent matches

## `/admin/notices`

Admin can:
- create
- edit
- verify
- reject
- expire
- duplicate
- merge
- add coordinates
- add affected radius
- preview matching users

## `/admin/deadlines`

Create/edit/verify deadlines.

## `/admin/sources`

Manage sources.

## `/admin/ingestion`

Show:
- source
- last attempt
- last success
- records found
- errors
- retry action

## `/admin/review`

Queue:
- new ingestion
- low confidence
- possible duplicate
- missing coordinates
- stale notices

Protect all admin routes by role.

# Source architecture

Create a standard adapter contract such as:

```ts
interface SourceAdapter {
  fetch(): Promise<RawSourceItem[]>
  normalize(item: RawSourceItem): Promise<NormalizedNotice>
}
```

Implement reusable adapters:
- ManualSourceAdapter
- RSSSourceAdapter
- HtmlSourceAdapter
- JsonApiSourceAdapter

No aggressive scraping.

Respect robots.txt and terms.

# Source configuration

Create:
`src/config/sources.ts`

Seed source definitions/placeholders for:

- County of Brant News
- County of Brant Public Notices
- County of Brant Current Construction Projects
- Municipal511
- EngageBrant
- County of Brant Active Planning Applications
- County of Brant Recreation
- Brant Transit
- Downtown Paris BIA
- Paris Fairgrounds
- Grand River Conservation Authority
- County emergency pages
- appropriate electricity outage pages
- local library/community programming
- trusted local media as secondary sources

Do not scrape private Facebook groups.

Community posts can eventually be used as signals only.

# Source trust rules

Ranking:

1. Official municipal/government
2. Official agencies
3. Trusted local organizations
4. Trusted local media
5. Community signals

Community signals cannot trigger authoritative alerts unless independently verified.

# AI

App must work without AI.

If `OPENAI_API_KEY` exists, AI may be used for:

## Plain-language summaries

Convert bureaucratic municipal language into simple resident-friendly text.

## Category/tag classification

Validate with Zod.

## Date and street extraction

Always preserve source text.

## Weekly digest summary

Example:

**This week near Home**
- 2 construction updates
- 1 planning item
- 1 deadline
- 4 weekend events

AI must NEVER invent:
- closure times
- roads
- approvals
- deadlines
- outage status
- emergency instructions
- event dates

AI only transforms supplied source data.

# Email digests

Build digest-generation logic.

Default:
daily email digest.

Example:

**Your Paris Pulse — Monday**

### Near Home
Grand River Street construction
1.3 km away

### Deadline
Fall recreation registration opens tonight at 6 PM.

### Planning
One application within 2.4 km has a meeting this week.

### Weekend
4 events match your interests.

Every item links to:
- Paris Pulse detail
- original source

Use a provider abstraction so local dev works without Resend.

# Instant alert policy

Do not spam users.

Use instant alerts only for:
- urgent official notice
- significant road closure
- severe local disruption
- same-day facility closure
- major storm/emergency update
- explicit user reminder

Events should normally be digest content.

# Deadline reminders

Allow:
- 1 day before
- 1 hour before
- at opening/deadline time where supported

For MVP, persist reminders even if actual outbound scheduling is stubbed.

# Onboarding

Four fast steps.

## Step 1
Where should we monitor?

Address/postal code.

## Step 2
What matters?

Options:
- Roads & traffic
- Construction
- Planning & development
- Family & recreation
- Events
- Transit
- Downtown Paris
- Municipal notices
- Storms/outages

## Step 3
How close?

- 1 km
- 3 km
- 5 km
- All Paris

Default/recommended:
3 km

## Step 4
How should we update you?

Default:
Daily email.

Finish → personalized dashboard.

# UI design

Visual direction:

- Local
- Trustworthy
- Calm
- Highly readable
- Useful
- Modern
- Not overly “startup SaaS”

Avoid:
- neon gradients
- glassmorphism overload
- stock startup illustrations
- newspaper clutter
- excessive animation
- social-media aesthetics

Use:
- maps
- clear cards
- distance chips
- source badges
- timestamps
- category icons
- deadline countdowns
- strong information hierarchy

Paris' river/small-town identity can subtly influence the visual design.

# Mobile UX

Design phone-first.

Bottom navigation:
- Home
- Feed
- Map
- Saved
- Settings

Make interactions thumb-friendly.

# Components

Build reusable components including:

- NoticeCard
- NoticeList
- NoticeDetail
- DeadlineCard
- DeadlineCountdown
- CategoryBadge
- SeverityBadge
- DistanceBadge
- VerificationBadge
- SourceBadge
- LastVerified
- PersonalizedReason
- StormStatusCard
- OfficialOutageLinkCard
- MapNoticeMarker
- LocationPicker
- LocationCard
- AlertPreferenceCard
- FeedFilters
- DigestPreview
- SourceCard
- AdminNoticeEditor
- AdminDeadlineEditor
- AdminReviewQueue
- IngestionStatusCard
- EmptyState
- DisclaimerBanner

# Seed data

Seed enough realistic data to make the app complete.

At minimum:
- 1 community
- 4 saved locations
- 12 official sources
- 35 notices
- 8 deadlines
- all major categories
- 5 important notices
- 2 urgent sample notices
- 4 expired notices
- 5 planning items
- 7 road/construction items
- 6 events
- 5 family/recreation items
- 2 transit items
- 2 downtown items
- 3 storm/outage related items

All fake/demo content must display:

**Sample data**

Never present fabricated notices as current County information.

# Search

Support search for:
- street
- development
- event
- recreation
- category
- keywords

Examples:
- Paris Road
- Grand River Street
- swimming
- planning
- fair
- outage

# Duplicate detection

Implement deterministic duplicate detection based on:
- source URL
- normalized title
- dates
- similarity heuristic

Admins can merge duplicates.

# Expiration

Implement proper notice lifecycle.

- explicit expiry
- event end date auto-expiry
- deadline expiry
- old notices labelled Past
- expired items hidden from active feed
- admins can override

# Privacy

User location privacy is critical.

- RLS for private tables
- do not expose user addresses
- public maps show notice locations only
- no selling precise location data
- include privacy explanation
- collect minimal data

# Accessibility

Aim for WCAG-friendly implementation.

Include:
- semantic markup
- keyboard navigation
- focus states
- readable font sizes
- labelled forms
- accessible status indicators
- map fallback list

# SEO

Public pages should be indexable.

Support useful local queries such as:
- Paris Ontario road closures
- Paris Ontario construction
- Paris Ontario events this weekend
- Paris Ontario planning applications
- Paris Ontario recreation registration
- Downtown Paris parking
- Paris Ontario municipal notices

Implement:
- metadata
- OpenGraph
- sitemap
- robots
- structured data where useful

Do not generate SEO spam.

# Analytics abstraction

Track:
- notice_viewed
- source_clicked
- deadline_viewed
- deadline_reminder_added
- location_added
- alert_enabled
- notice_saved
- digest_signup
- map_opened
- event_clicked

Do not require a provider locally.

# Monetization readiness

Do not overbuild billing.

Prepare architecture for:

## Sponsored local content
Must be clearly labelled Sponsored.

## Promoted events

## Property/realtor professional tier

Potential future features:
- multiple monitored properties
- planning alerts
- daily professional digest
- permit/property module

## Local businesses

Featured merchant offers can come later.

Paid content must NEVER influence:
- emergency ranking
- municipal notices
- planning notices
- road closures
- storm information

# Feed ranking

Priority:

1. Urgent relevant official item
2. Important nearby item
3. Deadline approaching
4. New nearby item
5. Interest match
6. Paris-wide useful item
7. Event discovery

Sponsored items separate.

# Performance

Implement:
- DB indexes
- server-side data fetching where useful
- pagination
- lazy-loaded maps
- efficient queries
- image optimization
- no loading every notice on client

# Tests

Add meaningful tests for:

- Haversine distance
- relevance scoring
- deadline scoring
- expiry behavior
- category preferences
- user-location access isolation
- admin authorization
- source URL validation
- duplicate detection
- AI fallback
- storm notice handling

# Error states

Handle:
- geocoding failure
- no coordinates
- ingestion failure
- broken source
- AI unavailable
- email provider missing
- empty feed
- no local alerts
- duplicate data
- source stale

# Environment

Provide `.env.example`.

Possible vars:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
GEOCODING_PROVIDER_KEY=

Only Supabase should be required for core production functionality.

Optional integrations must fail gracefully.

# README

Write a complete README with:

- product overview
- architecture
- folder structure
- tech stack
- setup
- Supabase configuration
- database migrations
- seed commands
- environment vars
- test commands
- build commands
- deployment
- source ingestion
- admin setup
- limitations
- disclaimer
- roadmap

# Future roadmap

Document only.

## Phase 2
- live automated source ingestion
- production email delivery
- web push
- better geocoding
- PostGIS
- AI weekly summaries

## Phase 3
- Property & Permit Copilot
- planning/property professional tier
- family-provider availability
- downtown merchant promotions

## Phase 4
Expand to:
- Brantford
- St. George
- Burford
- Ayr
- Cambridge-area communities
- other Ontario municipalities

# Do NOT build

Do not build:
- user comments
- forums
- likes
- followers
- DMs
- marketplace
- anonymous posting
- generic news publishing CMS

Paris Pulse reduces local information noise.

It should not create more noise.

# Definition of done

The MVP is complete only if:

1. `/today` works without login.
2. Public sample notices render properly.
3. User can sign up/login.
4. User can save Home.
5. User can choose interests/radius.
6. Personalized feed updates.
7. Notice cards show relevance reasons.
8. Map works.
9. Deadlines work.
10. Storm/disruption page works.
11. Alert preferences persist.
12. Admin can create a notice.
13. Admin can create a deadline.
14. New notices generate user matches.
15. Expired notices disappear.
16. Source links work.
17. Sample data is unmistakably labelled.
18. Admin routes are protected.
19. User locations are private.
20. App works without AI.
21. App works without email API.
22. Tests pass.
23. Typecheck passes.
24. Lint passes.
25. Production build passes.

# Autonomous execution instructions

Do the actual implementation.

Do not just give me code snippets or an architecture proposal.

Do not ask questions.

Create/install everything needed.

When something cannot be implemented because an external credential is missing:
- build the integration abstraction
- provide a functional fallback
- document how to enable it

Before finishing:

1. Inspect the complete repository.
2. Install dependencies.
3. Run migrations/seed where possible.
4. Run lint.
5. Run typecheck.
6. Run tests.
7. Run production build.
8. Fix all errors.
9. Verify major routes.
10. Verify mobile responsiveness.
11. Verify auth/RLS assumptions.
12. Verify admin access protection.
13. Verify location matching.
14. Verify deadline logic.
15. Verify storm/disruption UX.
16. Verify sample labels.
17. Verify optional API fallbacks.
18. Improve any obviously unfinished UI.

Do not stop at “MVP scaffold complete.”

Deliver a product that looks and behaves like something that could actually be shown to Paris residents.

# Final response

When implementation is complete, return:

## Built
Concise overview.

## Main routes
List important routes.

## Architecture
Explain key technical decisions.

## Run locally
Exact commands.

## Environment variables
Required vs optional.

## Demo credentials/setup
Safe instructions for creating test/admin accounts.

## Validation
Report results of:
- lint
- typecheck
- tests
- build

## Known limitations
Be explicit.

## Next 5 improvements
Prioritized by impact.

The final repository should be a strong, production-ready foundation for launching **Paris Pulse in Paris, Ontario, Canada**.
