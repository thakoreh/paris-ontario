# Scheduled content ingestion

Use a **Coolify Scheduled Task inside the existing app container** every four hours.
It uses the site's image and commit, with no new service or cost on the 4 GB host.
A separate worker would consume more host resources and require another deployment.
This document describes a design; production scheduling and image contents are unverified.
Deployment uses Coolify + Nixpacks, no Dockerfile. The production process runs
`node .next/standalone/server.js` from `/app`; the task also needs `/app/scripts`
and its Python modules in that image. `.dockerignore` does not exclude scripts,
but Next standalone output alone does not include them. Verify their presence in
the deployed container before enabling the task; retain the repository scripts in
`/app` if image packaging changes.

## Unverified prerequisite: Python

**The Nixpacks Node image may not include python3.** In the Coolify terminal,
run the read-only command `python3 --version`. No production verification was
performed while implementing this runner. If Python is absent, either:

- Add `nixpacks.toml` with python3 in the setup phase's `nixPkgs` (preserving
  existing Node packages), then rebuild. This increases the image size.
- Use a tiny separate `python:3.12-alpine` Coolify scheduled container containing
  the same commit's scripts and environment. This is a fallback, not the preferred design.

## Coolify configuration

Scheduled Tasks > Add:

| Field | Value |
| --- | --- |
| Name | `paris-pulse-ingest` |
| Command | `python3 scripts/scheduled_ingest.py` |
| Frequency | `0 */4 * * *` |
| Container name | The app's main container; blank/default for single-container apps |

Working directory must be `/app`. Coolify cron timezone is a server/instance
setting: verify it is UTC for the following schedule. Runs are at 00:00, 04:00,
08:00, 12:00, 16:00, 20:00 UTC. In Eastern daylight time (UTC−4), these are
20:00 (previous day), 00:00, 04:00, 08:00, 12:00, 16:00; in Eastern standard
time (UTC−5): 19:00 (previous day), 23:00 (previous day), 03:00, 07:00, 11:00,
15:00. ET changes seasonally; UTC cadence stays fixed.

Environment variable names only:

| Name | Secret? | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Project HTTPS endpoint, required for remote writes |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Server-only service credential, required for remote writes |
| `PARIS_PULSE_AUTOPUBLISH` | No | Opt in to narrow County publication |
| `PARIS_PULSE_WRITE_HELD_DRAFTS` | No | Opt in to held drafts, never automatic event publication |
| `PARIS_PULSE_RECORD_CHECKS` | No | Opt in to source timestamps and ingestion run records |
| `PARIS_PULSE_STATE_DIR` | No | Writable state directory, e.g. `/tmp/paris-pulse` |
| `PARIS_PULSE_HEARTBEAT_URL` | **Yes** | Optional existing independent heartbeat integration |

Flags enable only on exact `1`, with both credentials present. Missing credentials
force source dry-runs. `--dry-run` overrides all flags and suppresses heartbeat
writes too. Dry-runs still fetch sources and write local audit/state files.
The County state default remains the box's existing home directory location.
Container `/tmp` state and locks are ephemeral and local to that container, not a
distributed lock. Database duplicate checks remain authoritative across rebuilds.

## Execution and honest checks

The entry point holds a nonblocking process lock for both sequential sources:
County of Brant News, then Brant Events. One source failing does not stop the
other; any source or recording failure returns exit 1. Logs contain compact JSON
counts and generic errors, never raw exceptions or credentials. The existing
heartbeat reports overall success/failure when configured.

Only successfully retrieved discovery feeds count as fetched, including feeds
that subsequently fail parsing. A connection failure before retrieval does not
advance source timestamps. With recording enabled, fetched sources get
`last_checked_at` and an `ingestion_runs` row containing source ID, start/end,
status, found/created/failed counts and a bounded generic error. Only successful
runs advance `last_success_at`. Expected editorial holds are successful checks;
parser or backend failures are not. Manual/link-only sources are never marked
checked by this job. The scheduler disables adapters' legacy audit writes to
avoid duplicates and to keep recording under its own flag.

## Source feasibility

Based on the read-only findings of 2026-10-18; access and source formats can change.

| Source | Approach | Feasibility and limits |
| --- | --- | --- |
| County of Brant News | Automated | Existing RSS + independent article review; narrow Paris routine road/waste rules and publishing cap remain enforced. |
| County of Brant Culture Days | Manual weekly review | Static reference page, no feed; seasonal changes do not justify fragile scraping or inferred event facts. |
| County of Brant Elections | Manual weekly review | Static reference page, no feed; sensitive election facts make unattended extraction unsafe and not worth automating. |
| County of Brant Public Library hours | Manual weekly review | Static reference page, no feed; hours need contextual human review. Calendar paths under `/en/inc/` are disallowed. |
| Brant Transit | Manual weekly review | Static reference page, no feed; service details require contextual verification rather than fragile change inference. |
| Paris Agricultural Society | Manual | HTML only, no Event JSON-LD; Facebook-linked events make unattended extraction fragile. |
| GRCA flood messages | Link only | No RSS found; safety-critical flood content matches editorial `BLOCK`. No automated safety summaries. |
| Municipal511 | Link only | JS map, no robots file and no public API found; absence of robots is not an API agreement. |
| GrandBridge outages | Link only | JS third-party map, crawl-delay 10; outages match `BLOCK`. Corporate news RSS is not an outage feed. |
| Brant Events (new) | Automated discovery, held for review | Allowed RSS and Event JSON-LD detail pages; community aggregator, not official. Many events are outside Paris. Draft-only writes require explicit opt-in; never auto-publish. |

## Rollout and rollback

1. Verify Python, script availability, writable state path, deployed commit and
   cron timezone. First run with all flags off: dry-run sources and observe logs.
   `--dry-run` can enforce this even if environment flags are accidentally enabled.
2. Enable `PARIS_PULSE_RECORD_CHECKS` only; verify only fetched sources advance,
   and failed/partial checks preserve their previous success timestamp.
3. Enable `PARIS_PULSE_AUTOPUBLISH`; inspect County publication and readback.
4. Enable `PARIS_PULSE_WRITE_HELD_DRAFTS`; inspect drafts and editorial review queue.

Rollback: disable the Coolify task. This stops future runs; it does not undo
published records. Keep `scripts/official_publisher_cron.py` unchanged for the
existing box routine. Once the Coolify task is verified, a human should decide to
retire the box routine to avoid two schedulers; do not leave overlapping jobs
unattended. No task, environment or database change is activated by this document.
