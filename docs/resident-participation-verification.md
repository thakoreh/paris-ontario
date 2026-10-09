# Resident participation verification

Release branch: `feat/resident-participation-20261008`, based on `8faa7ef`.

## Controller-run release gates

- ESLint and TypeScript passed.
- Vitest: 431 tests passed across 46 files.
- Full resident Playwright regression suite: 112 passed across desktop and mobile, including WCAG A/AA automated checks, private area/saved state, contribution gating, navigation, sharing, and source/empty states.
- Production-mode route status checks: 2 passed. This invocation rebuilt the standalone production application successfully with no fixture mode.
- Python: all 40 tests passed with the system Python, including the controlled America/Toronto and UTC regression. The alternate local Python lacks `time.tzset`; it skips that test, so it was not used as the sole final gate.
- Real localhost browser smoke: an open compact sharing popup with the documented HTTP app origin displayed disabled channel choices, emitted no external social links, and produced no page errors.
- Real official feed dry-run, isolated state, no database credentials: successful source read; zero eligible recent candidates, zero created records. This is not a production freshness update.

## Review findings resolved

- Missing React import exposed by server-rendered notice-card unit tests: fixed.
- Email URI encoding crashed on lone UTF-16 surrogates: helper rejects malformed text; valid emoji remains intact.
- Compact sharing evaluated invalid HTTP-origin links during render: fail-closed channel URLs and explicit unavailable state, without weakening HTTPS requirements.
- Navigation test clicked an SSR-rendered menu before AccountGate content hydrated: waits for real page content, not arbitrary sleeps or retries; repeated targeted checks passed.
- Publisher source URLs accepted userinfo: both nonempty and empty credentials now rejected.
- Date parsing accidentally changed timezone-less RSS semantics: restored baseline host-local interpretation with a boundary regression.
- Sample coverage and disabled-intake copy expectations updated without weakening the no-production-claim/no-database-write assertions.

The publisher review recommendations to scope same-URL duplicate protection by source identity and remove exact legacy-feed compatibility were rejected against documented requirements. Existing same-URL editor records must never be republished, and old/new feed equivalents are intentionally allowed on the same fixed host. Regression tests cover both boundaries.

## Deliberately not activated

No community-intake feature flag, schema migration, notification opt-in, social post, email send, or new monitoring service is part of this release. Email draft controls do not verify inbox receipt or promise an editor response. Public participation through a tracked inbox still requires operator/privacy decisions.

The scheduled publisher uses a separate clean checkout. Updating application containers alone does not update it; synchronize that checkout only to the reviewed release and retain the existing schedule and safety gates. No source timestamp should be advanced merely to hide stale coverage.
