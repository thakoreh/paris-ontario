# Resident usability release

## Scope

- A mobile Menu disclosure lists all primary resident destinations and personal destinations. It uses native links, indicates the current page, closes on navigation, and supports Escape with focus returned to the trigger. It is not a modal dialog.
- The notice feed announces visible and total result counts, exposes category selection and filter expansion to assistive technology, and provides one-click reset of search/filter/sort settings. Saved mode retains its saved-only constraint when reset.
- Empty results distinguish unmatched filters from an empty saved list or no current notices.
- The overview's upcoming deadline count excludes past/invalid dates and uses the explicit label “deadlines in the next 7 days”. The interval is [now, now + 7 days).

## Verification before deployment

- 84 unit tests passed, including new deadline boundary tests.
- ESLint and production build passed.
- Four Playwright checks passed against the local production build: filter/reset and mobile navigation, each under desktop/mobile projects.
- Mobile screenshot inspection: no clipped navigation controls or horizontal overflow; no page errors observed; all 13 menu destinations present.
- Feature tests were observed failing before their implementation.
- Independent review found a future expiry hazard in the test-only preview fixture. The default preview test run freezes browser time; explicit live/base-URL runs retain real time.

## Known blockers, not addressed by this release

- Supabase Auth has no custom SMTP configured. The project has no project-scoped sender credentials. Signup confirmation/password-reset email delivery remains unverified and blocked on a sender decision. No emails were sent or provider settings changed.
- Mobbin's public URL leads to its signup/marketing page; authenticated design-library access is not established. This release is a functional usability repair, not a Mobbin-backed redesign.

## Rollback

Previous deployed commit: `91d62c8809ec060ef59d4415ecbe547b8c5ce880`.
No database schema, credentials, or server environment changes are required by this release. Redeploy the previous commit through the existing Coolify app if necessary.
