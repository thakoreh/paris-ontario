# Paris Pulse automated official-source updates

Status: operating on the Hermes host as an external editorial worker; no Next.js container deployment is required for content changes. This worker uses the production Supabase service role from the existing local `.env.local` file. The credential is never printed, committed, or sent to an LLM.

## Scope and guardrails

- **Only** the County RSS `https://www.brant.ca/news/rss` for discovery and exact `https://www.brant.ca/news/posts/<slug>/` article URLs. Fixed HTTPS allowlist, redirects and oversized responses rejected. The source registry links to `https://www.brant.ca/news/`.
- Recent articles (source date within five days), County `Road Construction` category, explicit Paris locality in headline or source excerpt. Source article is independently re-fetched before approval. No search snippets, generated descriptions, inferred dates/locations, RSS from other sites, or resident submissions.
- No emergency, flood, outage, election, health, school, safety or ambiguous claims. Other categories remain manual until separately tested and approved. Rejected candidates are logged with reasons, not published.
- Only the source headline and an intact first paragraph are used, followed by a link reminder. Severity is always `info`, not an alert. No precise coordinates are invented. Records expire within 72 hours, even if the original project continues.
- Never overwrite an existing notice with the same official URL, including an editor-created one. Supabase unique slug/external ID also guard against concurrent duplicate insertion. Maximum two County auto-publications per UTC day. The publisher reads back the exact record after writing.
- Expected editorial exclusions are held; malformed source fields, fetch failures and backend failures degrade the run and alert. They never advance a source success timestamp.
- Production `official_sources` timestamps and `ingestion_runs` are updated only after successful source review. Local JSONL audit and last-run heartbeat are retained under `~/.hermes/paris-pulse-publisher/`.
- The independent reviewer agent checks published source-vs-live content after the fact. It reports concerns; it does not bypass the deterministic pre-publication gate. The advisor agent reacts to status changes; the script-only watchdog reports outages even if the advisor model fails.

## Entrypoints

```sh
python3 -m unittest discover -s tests -p 'test_official*.py' -v
python3 scripts/official_publisher.py                         # read-only preview
python3 scripts/official_publisher.py --publish --env-file ~/microsaas-projects/paris-ontario/.env.local
python3 scripts/official_publisher_cron.py                    # silent on no changes
python3 scripts/official_watchdog.py --monitor                # stable OK/incident fingerprint
python3 scripts/official_reviewer_context.py                 # read-only reviewer input
```

Scheduled jobs: source publisher every four hours, no-agent watchdog hourly, LLM reviewer daily and an incident advisor on changed watchdog status. Jobs use absolute script paths in the dedicated clean worktree. The old research-only freshness job is paused after the replacement is verified.

## Incident procedure

1. Publisher failed/partial: inspect local `last_run.json` and `audit.jsonl` (no credentials inside), source page and Supabase `ingestion_runs`. Do not bypass safety filters to fill the feed.
2. Source layout changes: stop publication; update parser with a real failing fixture before re-enabling.
3. Supabase unavailable: no writes should occur; verify exact URL before retry to avoid duplicates.
4. Site down: check `https://parispulse.ca/api/health`, Coolify container/queue and DNS. A healthy publisher does not prove that the app is serving.
5. Stop automated publishing: pause the publisher cron job. Run `scripts/official_watchdog.py --monitor` and inspect the paused job before restarting.

Limitations: this worker runs on Hiren's Hermes host. If that host or the Hermes scheduler itself is offline, its cron jobs cannot deliver alerts. Host-independent monitoring would need a separate external uptime service or server-side watchdog. Do not imply emergency/outage monitoring or comprehensive County coverage from this narrow source.

## Reliability release

The host-independent monitor integration is opt-in and not activated by this code. See [independent monitoring](independent-monitoring.md) for operator setup and verification, and [content operations](CONTENT_OPERATIONS.md) for the ongoing editorial plan. Run all publisher/heartbeat tests with `python3 -m unittest discover -s tests -p 'test_*.py' -v`.
