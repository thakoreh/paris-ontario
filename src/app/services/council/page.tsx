import Link from "next/link";
import {
  councilConfig,
  councilDecisions,
  councilLinks,
  type CouncilMeeting,
} from "@/lib/explore-content";
import { publicData } from "@/lib/repository";
import { publicRouteMetadata } from "@/lib/seo";
export const dynamic = "force-dynamic";
export const metadata = publicRouteMetadata({
  title: "Council & elections — Paris, Ontario",
  description:
    "Find official County of Brant council, ward and meeting information, with source-linked council notices.",
  path: "/services/council",
});
function Meeting({ meeting }: { meeting: CouncilMeeting }) {
  return (
    <article className="panel">
      <h3>{meeting.title}</h3>
      <p>
        <time dateTime={meeting.starts_at}>
          {new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Toronto",
            dateStyle: "full",
            timeStyle: "short",
          }).format(new Date(meeting.starts_at))}
        </time>
      </p>
      <div className="action-row">
        <a className="text-link" href={meeting.agenda_url}>
          Agenda ↗
        </a>
        {meeting.livestream_url && (
          <a className="text-link" href={meeting.livestream_url}>
            Livestream ↗
          </a>
        )}
        <a className="text-link" href={meeting.source_url}>
          Source: County of Brant ↗
        </a>
      </div>
      <small>
        Checked{" "}
        <time dateTime={meeting.reviewed_at}>{meeting.reviewed_at}</time>
      </small>
    </article>
  );
}
export default async function Page() {
  const data = await publicData();
  const decisions = data.error ? [] : councilDecisions(data.notices);
  const now = new Date().getTime();
  const next =
    councilConfig.nextMeeting &&
    Date.parse(councilConfig.nextMeeting.starts_at) > now
      ? councilConfig.nextMeeting
      : null;
  const committees = councilConfig.committees.filter(
    (m) => Date.parse(m.starts_at) > now,
  );
  return (
    <div className="page-wrap revamp-page">
      <h1>Council & elections</h1>
      {next && (
        <section>
          <h2>Next council meeting</h2>
          <Meeting meeting={next} />
        </section>
      )}
      {committees.length > 0 && (
        <section>
          <h2>Upcoming committee meetings</h2>
          {committees.map((m) => (
            <Meeting key={m.source_url} meeting={m} />
          ))}
        </section>
      )}
      {councilLinks.map((link) => (
        <section key={link.title}>
          <h2>{link.title}</h2>
          <div className="panel">
            <p>{link.description}</p>
            <a className="text-link" href={link.source_url}>
              Source: County of Brant · councillors, wards & meeting calendar ↗
            </a>
            <small>
              Checked{" "}
              <time dateTime={link.reviewed_at}>{link.reviewed_at}</time>
            </small>
          </div>
        </section>
      ))}
      {decisions.length > 0 && (
        <section>
          <h2>Recent decisions</h2>
          {decisions.map((n) => (
            <article className="panel" key={n.id}>
              <h3>
                <Link className="text-link" href={`/notice/${n.slug}`}>
                  {n.title}
                </Link>
              </h3>
              <p>{n.summary}</p>
              <a className="text-link" href={n.official_url}>
                Source:{" "}
                {data.sources.find((s) => s.id === n.source_id)?.organization ||
                  "Original notice"}{" "}
                ↗
              </a>
              <small>
                Checked{" "}
                <time dateTime={n.verified_at!}>
                  {n.verified_at!.slice(0, 10)}
                </time>
              </small>
            </article>
          ))}
        </section>
      )}
      <Link className="button outline" href="/services">
        All services
      </Link>
    </div>
  );
}
