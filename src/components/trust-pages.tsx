import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export type TrustPageKind = "editorial-policy" | "privacy" | "terms" | "contact";

function SupportContact() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  if (!email)
    return (
      <p>
        A monitored support email must be configured before public launch. Until
        then, do not rely on Paris Pulse for account or time-sensitive support.
      </p>
    );
  return <a className="text-link" href={`mailto:${email}`}>{email}</a>;
}

export function TrustPage({ kind }: { kind: TrustPageKind }) {
  const content = {
    "editorial-policy": {
      eyebrow: "HOW INFORMATION EARNS A PLACE HERE",
      title: "Editorial policy",
      sections: (
        <>
          <h2>Original sources first</h2>
          <p>
            Paris Pulse prioritizes the County of Brant, public agencies, and
            other named local organizations. Every published notice must include
            its original source URL. Links to a source homepage are not enough
            for time-sensitive claims.
          </p>
          <h2>Review before publishing</h2>
          <p>
            Editors compare the title, details, location, dates and expiry with
            the original source. Unreviewed items stay in the editorial queue.
            We correct, expire or remove a notice when its source changes.
          </p>
          <h2>Freshness is visible</h2>
          <p>
            Source review times appear on the Sources page. A source that is
            overdue or has not been checked is shown as needing attention, not
            as current coverage.
          </p>
          <h2>What we do not do</h2>
          <p>
            We do not publish anonymous claims as authoritative updates, invent
            event details, scrape private groups, or represent Paris Pulse as an
            official government service.
          </p>
        </>
      ),
    },
    privacy: {
      eyebrow: "PRIVACY & DATA USE",
      title: "Your information stays yours.",
      sections: (
        <>
          <h2>Locations and preferences</h2>
          <p>
            Saved locations are used only to personalize relevance. Public maps
            show notice locations, never a resident’s saved place. Guest data
            remains in this browser; signed-in data is protected by account-level
            access controls.
          </p>
          <h2>Service providers</h2>
          <p>
            Map tiles are served by OpenStreetMap. Authentication and private
            storage use Supabase when configured. Email is used only when you
            opt in and a production delivery provider is enabled.
          </p>
          <h2>Browser notifications</h2>
          <p>
            If you enable browser notifications, we store your push endpoint and
            encryption keys with your account in Supabase. Your browser’s push
            provider delivers encrypted notification payloads. Editors may send
            verified community-wide notices; these are not emergency alerts or
            personalized location matches. Delivery records help prevent duplicate
            sends. Disabling a subscription removes its endpoint, keys and linked
            delivery records. You can also revoke browser permission.
          </p>
          <p><Link className="text-link" href="/notifications">Manage browser notifications</Link></p>
          <h2>Newcomer checklist</h2>
          <p>Checklist progress is saved only in this browser. Use Reset checklist
            on the newcomer page or clear browser data to remove it.</p>
          <h2>Your choices</h2>
          <p>
            You can update or clear browser-stored guest data in Settings. Use
            the contact route for account-access or deletion requests once the
            monitored support address is live.
          </p>
        </>
      ),
    },
    terms: {
      eyebrow: "TERMS OF USE",
      title: "Use Paris Pulse as a guide, not the final authority.",
      sections: (
        <>
          <h2>Information may change</h2>
          <p>
            Paris Pulse summarizes public information for convenience. Verify
            decisions, travel, deadlines, eligibility and safety details with
            the original source. Paris Pulse is not an emergency, outage, flood
            or weather-warning service.
          </p>
          <h2>Respectful use</h2>
          <p>
            Do not misuse the service, attempt to access another person’s saved
            information, or use the site to make decisions for others without
            checking the linked source.
          </p>
          <h2>Independent service</h2>
          <p>
            Paris Pulse is independent and is not affiliated with the County of
            Brant unless an official relationship is explicitly stated.
          </p>
        </>
      ),
    },
    contact: {
      eyebrow: "CONTACT & CORRECTIONS",
      title: "Help keep local information accurate.",
      sections: (
        <>
          <h2>Report a correction</h2>
          <p>
            Include the Paris Pulse page, the original source URL and the detail
            that needs correction. Editors review source-backed corrections and
            update, expire or remove records as appropriate.
          </p>
          <h2>Account and privacy requests</h2>
          <p>
            Use the support contact for account-access, deletion or privacy
            questions. Never send home addresses or emergency details by email.
          </p>
          <SupportContact />
        </>
      ),
    },
  }[kind];

  return (
    <div className="page-wrap prose">
      <span className="eyebrow">{content.eyebrow}</span>
      <h1>{content.title}</h1>
      <div className="trust-explainer">
        <ShieldCheck />
        <p>
          For emergencies, call 911 and follow official emergency authorities.
        </p>
      </div>
      {content.sections}
      <p>
        <Link className="text-link" href="/sources">Review our sources</Link>
        {" · "}
        <Link className="text-link" href="/editorial-policy">Read the editorial policy</Link>
      </p>
    </div>
  );
}
