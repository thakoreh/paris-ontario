# Resident participation implementation plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make real local information easier to share, correct and contribute without launching an unmoderated social network or pretending disabled services work.

**Architecture:** Extend the existing neighbourhood-first UI and canonical public-link helpers. Keep public sharing separate from private area data. Use explicit, resident-initiated email composition as an honest alternative while database intake is disabled; never send mail automatically, imply receipt, or enable intake without its operational prerequisites.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Playwright, Supabase (existing read-only deployment configuration).

## Evidence and baseline

Live release 8faa7ef: homepage has two notices; all nine active sources overdue. Intake returns accepting:false; the public contact page has a configured support email. Existing detail/guide share controls already implement native share, clipboard and manual-copy fallback. Preserve these rather than duplicate them. Mobbin references reviewed in /tmp/paris-theme-research.md support contextual share actions and stable navigation; public evidence only, not authenticated Mobbin Pro research. Keep sage/forest editorial theme and existing four primary destinations.

Baseline: lint, typecheck, 383 unit tests, 31 Python tests, production build, and 36 targeted desktop/mobile browser tests passed before editing.

## Task 1: Contextual resident sharing

Files: src/components/share-button.tsx, src/lib/share-link.ts, src/components/cards.tsx; focused CSS file; tests/share-link.test.ts and new browser tests.

1. Add a failing behavioral test for explicit optional link-sharing actions on a feed card.
2. Add an accessible compact card share control using only the public notice slug/title and canonical origin. Preserve native share, abort semantics and manual-copy fallback. Optional WhatsApp/email compose links must require an explicit click, encode only public content, and never contact those services at page load.
3. Reuse existing share primitives; preserve details/guide tests and styling. No account IDs, location/radius, query/hash, subscriber data or fake counts in shares.
4. Verify keyboard operation, focus, mobile width, copy denial, cancellation, and clean recipient URL in unit/browser tests.

## Task 2: A real contribution and correction path while intake is off

Files: src/components/community-submission-form.tsx, new src/lib/community-email.ts and email UI component; src/components/detail.tsx, src/components/trust-pages.tsx; focused tests.

1. Failing tests for bounded and encoded email drafts, invalid/unconfigured support address, and no false receipt claim.
2. Keep existing private-queue submission flow unchanged when enabled. When disabled and a valid configured support address exists, let residents explicitly prepare/open an email draft of their validated public tip. Clearly say opening a draft sends nothing; email provider and sender identity are involved; no guaranteed response/publication. Provide selectable/copy fallback if mail app is unavailable. No endpoint/migration/secret changes.
3. On notice detail add source-backed correction action with canonical page and original source context, editable in the resident's own email app. No hidden posting or email sending.
4. Update privacy/contact copy to distinguish database tips from voluntary email. Do not claim a response SLA or delete/retain policy that is not implemented.
5. Test enabled/off/unconfigured states, failed copy, text length and header injection, and preserve original submission tests.

## Task 3: Honest coverage and useful empty states

Files: src/components/feed.tsx, new component/CSS, tests for the new UI. No shared files owned by tasks 1/2.

1. Add failing tests for overdue/unknown source coverage and context-appropriate empty-state actions.
2. Reuse contentFreshness(sources) to expose limited/overdue coverage in Today without re-dating notices. Link to source directory, not an invented refresh.
3. Give empty event/opening/community sections direct links to useful existing services/contribution flow; make All Paris an actual existing scope change where applicable. Compact meaningful empty states, preserve populated cards and all unique grouping logic.
4. Replace premature 'send/goes live' contribution copy with accurate prepare-for-review language. Add small neighbour invitation using existing ShareButton only if ownership permits controller integration.
5. Test both loaded content and empty/filtered states at desktop, 390px and 320px; no new primary nav destination.

## Task 4: Restore the narrow official-source reader

Parent reproduced the source migration: old `/news/rss` redirects to `/news-and-notices/rss/`, and article links now use `/news-and-notices/posts/`. The allowlist correctly rejected this unrecognized path. The scheduler entrypoint exists in `~/.hermes/scripts` and delegates to a clean but older publisher checkout at a2ca593; it is not missing.

Files: scripts/official_publisher.py, tests/test_official_publisher.py or a focused new Python test, and a short operations note.

1. Failing tests for the observed canonical feed/article paths and authorized same-slug legacy redirects.
2. Support only the exact verified County HTTPS host/path shapes; preserve sensitive-content exclusions, Paris and category checks, rate caps and independent review. Do not bypass protections or treat arbitrary redirects as safe.
3. Account for equivalent old/new article URLs in duplicate checks; no duplicate publications due solely to path migration.
4. Unit tests and a read-only live source check in an isolated temporary state directory, with no production DB or credentials. No publisher invocation that writes live records.
5. After independent review and merge, deploy the reviewed worker revision to its existing clean checkout; verify wrapper and failure propagation. Do not resume paused jobs, broaden publication scope, manually publish, or imply current content simply because RSS reads work.

## Review and release gates

- Independent spec review, then quality/security review, fix all important findings.
- Full lint, typecheck, unit/Python suite, production build; desktop/mobile regression tests for changed flows and existing nav/accessibility/share/contributions.
- Preserve original dirty worktree and never pull/rebase/stash it. Merge via clean worktree after branch tests; no force push, no automatic social posts.
- Deploy only tested commit via existing Coolify queue; read back running SHA, health and live feature-specific behavior. No production migration, notification send, external post, or automatic email in this release.
- Report remaining blockers honestly: source publishing process, monitored editorial ownership, retention policy, secure receipt/response tracking before expanded UGC/comments/groups.
