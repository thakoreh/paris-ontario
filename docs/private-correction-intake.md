# Private correction intake

## Immediate mitigation

Correction requests, email contributions and the support mailto are disabled in
the application. Notice details and Contact explain that requests are unavailable;
the original source remains accessible. Private community submissions retain their
existing availability gates. Recipient-free email sharing is unaffected.

The app no longer reads `NEXT_PUBLIC_SUPPORT_EMAIL`, including in the retained
pure email-draft helpers. Do not reintroduce a recipient through props, JSON, HTML,
source maps, obfuscation or a public environment variable. A server-rendered email
link would still expose it. The removed email-draft UI cannot render a recipient.

During a separately authorized rollout, remove the old setting from build and
runtime configuration, produce a fresh build, deploy it, and verify notice,
Contact, Privacy and disabled contribution pages plus their downloaded assets.
Changing a runtime setting alone does not replace previously inlined client code.
CI deliberately builds with a nonpersonal canary recipient and scans public
assets/prerendered responses; unit/browser regressions cover the unavailable UI.

This patch is code preparation only. It does not merge, deploy, modify production
settings or purge caches. Existing deployed bundles/pages, CDN/browser caches,
search indexes, archives and repository history may retain the former address.
Public commit author metadata may also expose an email independently of this UI;
review GitHub email privacy for future commits. Historical removal/cache expiry
needs separate operator review and cannot retract already copied data.

## Existing infrastructure assessed

- `src/lib/email.ts` has a server-use Resend HTTP adapter using `RESEND_API_KEY`
  and `EMAIL_FROM`, and a local provider returning `not_configured`. It is not a
  correction endpoint or proof of configured/authorized delivery. No send was
  attempted and no provider settings or secrets were inspected or changed.
- `/api/community-submissions`, `src/lib/submission-server.ts` and migration
  `202610020005_private_community_submissions.sql` provide gated private intake,
  strict bounded input, origin checks, a honeypot, atomic per-network/global
  rate limits and editor-only review. The schema represents public local tips,
  not corrections linked to an existing notice. It must not be presented as a
  working correction form.
- Repository defaults keep intake off. The migration, production service-role
  privileges, canonical origin, proxy-overwritten IP header, bypass prevention,
  operator-supplied rate-limit salt, monitoring and retention remain deployment
  gates documented in `NEXT_STEPS.md`. Their live readiness was not verified.

## Recommended next change and missing setup

Prefer a private editor queue using the existing Supabase stack. Add an explicitly
typed correction intake path with an existing public notice ID, bounded correction
text and public source URL; validate the referenced notice on the server. Reuse
the intake origin/body/honeypot controls and a shared atomic abuse budget rather
than creating a new limit that doubles allowed spam. Keep raw network addresses
out of stored submissions/logs and never fetch user-provided URLs automatically.
RLS/grants must restrict reads and editorial review; new requests must neither
publish changes nor trigger alerts. Show receipt only after confirmed persistence.

Before enabling a form, an operator must approve/apply the reviewed schema in
staging and production, verify the trusted ingress and privileges, supply the
existing required secret through authorized configuration, and establish a
monitored editor owner, retention/deletion policy and abuse monitoring. Test
unavailable/error/duplicate states, cross-origin and oversized requests, concurrent
rate limiting and unauthorized reads. Add edge traffic limits; if observed abuse
warrants a challenge, choose and authorize its configuration separately.

Optional email notification can reuse the existing adapter only after the owner
confirms an authorized provider account, verified sender, server-only destination,
delivery budget and send permission. Return neither recipient nor provider errors
to clients; do not use user input as a recipient or header. A queue avoids making
email delivery a prerequisite. No new credentials, paid services or live sends are
needed for the immediate mitigation, and none were created or performed.
