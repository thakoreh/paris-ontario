# Independent reliability monitoring

Implementation is opt-in and inactive until explicitly configured. No external
account, secret, monitor, or notification channel is created by this change.
The existing Hermes watchdog remains useful but cannot detect its own host dying.

## Activate after approval

1. Set up an external Healthchecks check for the publisher, owned by the site
   operator. Set a **4-hour period and 1-hour grace** for the documented 4-hour
   publisher schedule, and connect a tested operator notification channel.
2. The operator copies its `https://hc-ping.com/<uuid>` ping URL into the
   publisher cron process environment as `PARIS_PULSE_HEARTBEAT_URL`. This is a
   secret capability URL; keep it out of the repository, logs and NEXT_PUBLIC
   variables. The helper intentionally does not read the application env file.
3. Deploy the reviewed cron/helper code to the publisher host. Only a completed
   `run_status=ok` result sends a success ping. Partial/failed runs send `/fail`;
   a crash or offline host sends nothing and triggers the external dead-man timer.
   The request has an empty body, bounded 10-second timeout and no redirects.
   Delivery/configuration errors emit a generic local alert and exit nonzero.
4. Separately configure an external HTTPS uptime check, every 5 minutes, against
   `https://parispulse.ca/api/health`. Require HTTP 200 and body `ok: true` with
   `dataMode: supabase`. Treat a sustained failure (for example two checks) as
   actionable; verify recovery notifications too. The health route checks
   public Supabase reads, not just whether variables exist.
5. Verify alerts with a dedicated test check first, then an approved missed-ping
   drill. Confirm a real healthy publisher run renews the production check and
   that suppressing a ping creates the expected external alert. Do not invoke
   the live publisher merely to test monitor wiring.

Use provider-native notification integrations rather than a second cron on the
same host. A successful zero-publication run is still a heartbeat: editorial
freshness/coverage remains a separate daily review in CONTENT_OPERATIONS.md.
Healthchecks activation creates an external dependency and must be approved;
provider/account setup and credentials are not part of this local patch.

## Verification

`python3 -m unittest discover -s tests -p 'test_*.py' -v` tests ping routing,
provider validation, disabled mode, timeout configuration and failure behavior
with mocked network requests. CI also runs bounded desktop/mobile resident
browser checks against local deterministic fixtures, with no live credentials.

Provider protocol reference: [Healthchecks Pinging API](https://healthchecks.io/docs/http_api/). The helper requires the exact successful `OK` response; a soft HTTP-200 “not found” or rate-limit response does not count as delivery.
