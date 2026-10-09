# Paris Pulse: resident participation and release priorities

Research and live audit: 2026-10-08. Baseline application commit: 8faa7ef. This document separates observed problems, recommendations and implemented scope; it is not a claim of active community membership.

## What the live site needed

- Today showed two updates with September verification dates. Sources showed nine active sources overdue. A populated interface is not proof of current coverage.
- Native/copy/manual sharing already existed on detail and guide pages but not directly on notice cards. Guest bookmarks, private areas, interests and opt-in browser push also already existed.
- The community form could validate/preview but production intake returned `accepting:false`. The private queue does not publish, reply or send notifications. Launching a form without an actionable next step loses prospective contributors.
- The public contact address is configured, permitting voluntary email composition without a new database collection system. Opening an email draft must not be presented as sending or acceptance.
- Empty event/opening/deadline shelves and a map with zero located updates consumed substantial mobile space. The basic sage/forest editorial theme and four primary destinations were coherent; another wholesale redesign was not warranted.

## Research and design evidence

### Local relevance and discovery

Research discovery surfaced County event-feedback and Paris planning reports as potentially relevant local evidence. A direct verification request to the event report returned an EngageBrant sign-in page, so the local-demand interpretations below remain research leads, not confirmed findings. Do not claim resident demand or publish quotations from inaccessible reports.

Event feedback lead (hypothesis to verify: promotion/discovery friction):
https://engagebrant.ca/events/news_feed/thank-you-for-sharing-your-thoughts-on-events-in-the-county-of-brant

Paris planning feedback lead (hypothesis to verify: timely information and questions):
https://engagebrant.ca/cpps/news_feed/thank-you-for-your-feedback-here-s-what-we-heard-and-what-s-next

Downtown feedback lead (hypothesis to verify: access and resident-serving amenities):
https://engagebrant.ca/dtpzoning/news_feed/thank-you-for-participating-here-s-what-we-heard-and-what-s-next

The release is justified by directly observed product gaps, not claimed survey demand. Test the contribution loop with actual residents before expanding scope.

### Social product and moderation

Nextdoor's transparency report describes significant moderation operations. Copying its public-post/comment surface also imports that burden:
https://about.nextdoor.com/press-releases/nextdoor-publishes-2025-transparency-report

Front Porch Forum's moderated submission and email-relay patterns show a useful separation between local contribution, review and private response:
https://help.frontporchforum.com/how-to-submit-forum-postings
https://help.frontporchforum.com/how-email-relay-works

Paris Pulse does not implement Front Porch Forum's relay. The first release uses the resident's own email app and the existing public support contact, with explicit disclosure that sender identity is visible after sending.

### Theme and interaction references

Actual public Mobbin pages reviewed (no claim of authenticated Pro research):
- Facebook Local share action sheet: https://mobbin.com/explore/screens/fd09ac41-c706-4543-8e7d-8846d413e2a7
- Nextdoor sharing flow: https://mobbin.com/explore/flows/b278d4f1-98e7-4915-91c2-264f86cff9c6
- Mobile tab bar examples: https://mobbin.com/explore/mobile/ui-elements/tab-bar

Lazyweb searches returned community navigation and article-share references (Medium and other products), supporting contextual share controls and stable navigation. These are design references, not conversion experiments or evidence of guaranteed growth. No competitor assets are copied into the site. Dark mode is optional, not a prerequisite for useful local participation.

## Bounded release

1. Put public-link sharing on notice cards. Separate external sharing from suggesting new information. Keep source URLs, private areas and personal preferences out of share payloads.
2. Offer a clearly voluntary email-draft route for validated tips when private intake is unavailable, plus a correction draft on notice detail pages. No automatic messages or false receipt states.
3. Make overdue coverage and empty-state next steps visible. Avoid an empty map canvas where no notice can be located. Invite neighbours using a clean public link, never a private area URL.
4. Fix the proven County source path migration, preserve the strict allowlist and narrow editorial rules, and align the actual publisher worker with reviewed code.

The County migrated `/news/` to `/news-and-notices/`. Parent HTTP checks confirmed the RSS and article path change on the same official host. Existing rejection was fail-closed, not a reason to remove host/path validation. The scheduler wrapper resolves under `~/.hermes/scripts` and delegates to an older worker checkout; the wrapper file is not missing.

## Acquisition → contribution → response → return

### Usable now, with human editorial work

- **Recruit:** Hiren can share a specific useful notice or source-linked guide with an existing local group, organizer or neighbour, subject to group rules and explicit approval before any post/outreach. No scraped mailing lists or unsolicited automation.
- **First action:** a visitor can save/share the notice or prepare a source-backed tip/correction. An email option is an explicit handoff to their mail app; the site cannot know whether they sent it.
- **Response:** a monitored editor can reply in that email thread with a source-backed answer, correction or reason the item cannot be used. This is manual and not guaranteed by the software.
- **Return:** the response can link to the corrected public notice; visitors can revisit Saved and choose relevant interests/optional browser notifications. The release does not add automatic alert dispatch or newsletter delivery.

### Next social feature: a private contribution inbox

Build this after the editorial owner and operating policy are settled:
- Authenticated author-only receipt/status view, explicit submitted / needs-source / answered / declined states and dated editor response.
- Separate response text from private moderator notes; no anonymous enumeration or bearer-token leakage.
- One bounded follow-up, server-side rate limits, abuse report/lock controls, deletion/retention rules and RLS/concurrency tests.
- Public output remains a reviewed source-backed update, not an open comment thread.
- Optional response notification only with deliberate opt-in and verified delivery. No fake unread badges or promised delivery from a provider-ready stub.

### Then, if response capacity is demonstrated

- Structured event/local-opening leads with verified date, venue, price/accessibility fields and cancellation handling.
- A weekly source-linked roundup only when there is enough fresh content. Email subscriptions require consent, working unsubscribe and a tested sender.
- Community questions with moderated, sourced answers. Do not add unmoderated resident reviews, private messaging, follower counts or public precise locations.

## Operational gates still separate from the release

- Private database intake stays off until migration/staging, trusted proxy header, rate-limit salt, editorial owner and retention/deletion policy are verified.
- Name an editorial owner and backup and agree a realistic response cadence before advertising a response promise. A configured contact address is not evidence of staffing.
- Recheck and refresh manual sources; a repaired RSS reader does not renew old notices or cover all events/businesses.
- Keep the paused broad freshness-review job paused unless separately authorized. Do not broaden the narrow auto-publisher into elections, health, emergency or opinion coverage.
- Verify real signup/confirmation email and author privacy before requiring accounts for contribution tracking.

## How to judge whether to build more

Measure actual qualified tips/corrections, response time, repeat contributors and resolved corrections. For the voluntary mailto route the site cannot measure sending or reply reading; use a small manual editorial log without copying unnecessary personal data. Use observed resident feedback rather than treating share-button clicks as successful recruitment. Expand only when useful content and timely human responses are sustainable.
