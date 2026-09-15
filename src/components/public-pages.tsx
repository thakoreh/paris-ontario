import Link from "next/link";
import {
  ArrowUpRight,
  CloudLightning,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import type { Notice, Source } from "@/types";
import { NoticeCard, SectionHeading } from "./cards";
import { isExpired } from "@/lib/relevance";
import { formatDate } from "@/lib/utils";
import { contentFreshness } from "@/lib/site";
export function StormPage({
  notices,
  sources,
}: {
  notices: Notice[];
  sources: Source[];
}) {
  const active = notices.filter(
    (n) =>
      ["storm", "outage", "emergency", "roads"].includes(n.category) &&
      !isExpired(n),
  );
  return (
    <div className="page-wrap">
      <span className="eyebrow">WHEN THINGS CHANGE QUICKLY</span>
      <h1>Storm & disruption.</h1>
      <p className="page-intro">
        Official information and essential tools, in one calm place.
      </p>
      <div className="emergency-banner">
        <CloudLightning size={23} />
        <div>
          <strong>
            For emergencies, call 911 and follow official emergency authorities.
          </strong>
          <p>
            Paris Pulse is not an emergency service. Live outage and flood
            status are not monitored here.
          </p>
        </div>
      </div>
      <div className="three-grid storm-tools">
        {[
          [
            "Power & outages",
            "Open the provider’s live tool. No outage status or restoration time is available in Paris Pulse.",
            "GrandBridge outage map",
          ],
          [
            "Roads & closures",
            "View official closure information before travelling.",
            "Municipal511",
          ],
          [
            "River & flood information",
            "Read the latest watershed bulletins directly from the conservation authority.",
            "Flood messages",
          ],
        ].map(([title, description, name]) => (
          <article className="panel" key={name}>
            <span className="external-badge">Linked external tool</span>
            <h2>{title}</h2>
            <p>{description}</p>
            <a
              className="text-link"
              href={sources.find((s) => s.name === name)?.url || "/sources"}
              target="_blank"
              rel="noreferrer"
            >
              Open {name}
              <ArrowUpRight size={15} />
            </a>
          </article>
        ))}
      </div>
      <p className="message-box">
        Electricity providers vary by address.{" "}
        <a
          href="https://www.hydroone.com/power-outages-and-safety"
          target="_blank"
          rel="noreferrer"
        >
          Check Hydro One
        </a>{" "}
        if that is your provider. For municipal emergency information, visit the{" "}
        <a href="https://www.brant.ca/" target="_blank" rel="noreferrer">
          County of Brant
        </a>
        .
      </p>
      <SectionHeading
        title="Disruption notices"
        note="Only verified notices appear here. For a live outage or flood warning, open the official tool above."
      />
      <div className="notice-list">
        {active.map((n) => (
          <NoticeCard
            key={n.id}
            notice={n}
            source={sources.find((s) => s.id === n.source_id)}
          />
        ))}
      </div>
    </div>
  );
}
export function SourcesPage({ sources }: { sources: Source[] }) {
  const freshness = contentFreshness(sources);
  return (
    <div className="page-wrap">
      <span className="eyebrow">TRUST STARTS WITH TRANSPARENCY</span>
      <h1>Always know the source.</h1>
      <p className="page-intro">
        Official information comes first. Every update takes you back to where
        it began.
      </p>
      <div className="trust-explainer">
        <ShieldCheck />
        <p>
          Government → official agencies → local organizations → local media →
          community signals. Unverified community signals cannot trigger
          authoritative alerts.
        </p>
      </div>
      <div className="message-box" role="status">
        <strong>
          {freshness.state === "current"
            ? "Source review is current."
            : freshness.state === "attention"
              ? "Some source reviews need attention."
              : "Source review history is not available yet."}
        </strong>{" "}
        {freshness.state === "unknown"
          ? "No active source has a recorded review time."
          : `${freshness.checkedSources} of ${sources.filter((s) => s.active).length} active sources have a recorded check; ${freshness.staleSources} need review.`}
      </div>
      <div className="two-grid">
        {sources.map((s) => (
          <article className="panel source-card" key={s.id}>
            <div className="card-eyebrow">
              {s.authority_level.replaceAll("_", " ")}
            </div>
            <h2>{s.name}</h2>
            <p>{s.organization}</p>
            <small>{s.description}</small>
            <dl>
              <div>
                <dt>Ingestion</dt>
                <dd>
                  {s.ingestion_type} ·{" "}
                  {s.ingestion_enabled ? "enabled" : "not automated"}
                </dd>
              </div>
              <div>
                <dt>Last checked</dt>
                <dd>
                  {s.last_checked_at
                    ? formatDate(s.last_checked_at)
                    : "Not yet checked"}
                </dd>
              </div>
            </dl>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              Visit source <ExternalLink size={14} />
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
export function AboutPage({ privacy = false }: { privacy?: boolean }) {
  return (
    <div className="page-wrap prose">
      <span className="eyebrow">INDEPENDENT. LOCAL. USEFUL.</span>
      <h1>
        {privacy ? "Your trust matters." : "Less noise. More neighbourhood."}
      </h1>
      {privacy ? (
        <>
          <h2>Information & emergencies</h2>
          <p>
            Information can change. Verify important details with the original
            source. Paris Pulse is not an official County of Brant service.
          </p>
          <p>
            <strong>
              For emergencies, call 911 and follow official emergency
              authorities.
            </strong>{" "}
            Paris Pulse is not an emergency service, outage monitor, or
            replacement for official warnings.
          </p>
          <h2>How updates are verified</h2>
          <p>
            Paris Pulse publishes only verified records with an original source
            link. Check important details with that source, because public
            information can change after it is published here.
          </p>
          <h2>Your locations stay private</h2>
          <p>
            Saved addresses are used to calculate relevance. Public maps show
            notice locations only. We do not sell precise location data.
            Private records are protected with row-level security; guest
            preferences stay in your browser.
          </p>
          <h2>External services</h2>
          <p>
            Map tiles are provided by OpenStreetMap. Your browser sends tile
            requests to its servers. Authentication and private storage use
            Supabase when configured. Optional email delivery uses the
            configured provider only.
          </p>
          <h2>Data control</h2>
          <p>
            You can remove saved locations and update preferences in Settings.
            Signing out of a guest session clears its stored data. Account
            deletion is currently an operator-assisted action through Supabase;
            establish a monitored support contact before public launch.
          </p>
          <h2>Alerts and reminders</h2>
          <p>
            Notification preferences and reminders persist. Automatic scheduling
            and push delivery are not yet enabled. Do not depend on this app for
            time-critical notifications.
          </p>
        </>
      ) : (
        <>
          <p className="detail-lead">
            What changed around me that I should care about?
          </p>
          <p>
            Paris Pulse brings trusted public information together for people
            who live in Paris, Ontario. Roads, planning, recreation, deadlines,
            storms: the useful things that are easy to miss when they’re
            scattered across websites.
          </p>
          <h2>Built around your everyday places</h2>
          <p>
            Save Home, Work or School. Pick the topics you care about and how
            far to look. Your feed explains why each update is relevant, with a
            clear path to the original source.
          </p>
          <h2>Independent, with official sources first</h2>
          <p>
            We are not a County service, newspaper or social network. There are
            no comments, likes or anonymous claims. We curate information and
            keep its source visible.
          </p>
          <h2>How updates are published</h2>
          <p>
            Every update is reviewed against its original source before it is
            published. Sources are checked manually until a reliable,
            reviewable integration is in place.
          </p>
          <Link href="/onboarding" className="button primary">
            Find your local Pulse <ArrowUpRight size={16} />
          </Link>
        </>
      )}
    </div>
  );
}
