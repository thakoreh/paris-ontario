import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { publicData, noticeBySlug, deadlineById } from "@/lib/repository";
import { privateRouteMetadata, publicRouteMetadata } from "@/lib/seo";
import { Feed } from "@/components/feed";
import { StormPage, SourcesPage, AboutPage } from "@/components/public-pages";
import { TrustPage } from "@/components/trust-pages";
import { NoticeDetail, DeadlinesPage } from "@/components/detail";
import {
  AuthForm,
  AccountGate,
  LocationsPage,
  LocationForm,
  PreferencesForm,
  Onboarding,
  SettingsPage,
} from "@/components/account";
import { Admin } from "@/components/admin";
import { ParisOntarioResourceHub } from "@/components/resource-hub";
export const dynamic = "force-dynamic";

function isKnownContentRoute(path: string[]) {
  const route = path.join("/");
  return (
    [
      "",
      "today",
      "storm",
      "deadlines",
      "map",
      "events",
      "paris-ontario",
      "sources",
      "about",
      "editorial-policy",
      "privacy",
      "terms",
      "contact",
      "disclaimer",
      "_not-found",
      "app",
      "app/feed",
      "app/map",
      "app/saved",
      "app/deadlines",
    ].includes(route) ||
    ((path[0] === "notice" || path[0] === "deadline") && path.length === 2)
  );
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}): Promise<Metadata> {
  const { path = [] } = await params;
  const route = path.join("/");
  const privateRoute = [
    "app",
    "admin",
    "login",
    "signup",
    "forgot-password",
    "reset-password",
    "onboarding",
  ].includes(path[0]);
  if (route === "_not-found") return privateRouteMetadata("Update not found");
  if (privateRoute) return privateRouteMetadata("Your Paris Pulse");

  const homepage = route === "";
  let title: string | undefined;
  let description: string | undefined;
  const canonical = route === "disclaimer" ? "/privacy" : route ? `/${route}` : "/";
  let type: "website" | "article" = "website";

  if (homepage) {
    title = "Paris, Ontario local updates and resources";
    description =
      "Source-linked local updates, practical resources and community information for Paris, Ontario.";
  } else if (path[0] === "notice" && path.length === 2) {
    const notice = await noticeBySlug(path[1]);
    if (!notice) return privateRouteMetadata("Update not found");
    title = notice.title;
    description = notice.summary;
    type = "article";
  } else if (path[0] === "deadline" && path.length === 2) {
    const deadline = await deadlineById(path[1]);
    if (!deadline) return privateRouteMetadata("Deadline not found");
    title = deadline.title;
    description = deadline.description;
    type = "article";
  } else {
    const pageMetadata: Record<string, { title: string; description: string }> = {
      today: {
        title: "Today in Paris",
        description:
          "The latest verified local updates and disruptions for Paris, Ontario.",
      },
      storm: {
        title: "Storm & disruption",
        description:
          "Verified storm, outage and disruption information for Paris, Ontario, with links to original sources.",
      },
      deadlines: {
        title: "Upcoming deadlines",
        description:
          "Verified public consultations, registrations and other upcoming deadlines for Paris, Ontario.",
      },
      events: {
        title: "Paris Ontario events",
        description:
          "Local events and community activities in Paris, Ontario, linked to their original sources.",
      },
      "paris-ontario": {
        title: "Paris, Ontario resource guide",
        description:
          "Source-linked guides for parks, getting around, family activities and essential services in Paris, Ontario.",
      },
      map: {
        title: "Local notice map",
        description:
          "Explore verified local notices and their affected areas around Paris, Ontario.",
      },
      sources: {
        title: "Our sources",
        description:
          "Named sources, review status and source transparency for Paris Pulse.",
      },
      about: {
        title: "About Paris Pulse",
        description:
          "Learn how Paris Pulse shares source-linked local information for Paris, Ontario.",
      },
      "editorial-policy": {
        title: "Editorial policy",
        description:
          "How Paris Pulse verifies, corrects and expires local information for Paris, Ontario.",
      },
      privacy: {
        title: "Privacy",
        description:
          "How Paris Pulse handles information and keeps saved locations private.",
      },
      terms: {
        title: "Terms of use",
        description:
          "Terms for using Paris Pulse local updates, guides and source links.",
      },
      contact: {
        title: "Contact and corrections",
        description:
          "Contact Paris Pulse about corrections, sources and local information.",
      },
      disclaimer: {
        title: "Privacy",
        description:
          "How Paris Pulse handles information and keeps saved locations private.",
      },
    };
    const current = pageMetadata[path[0]];
    title = current?.title;
    description = current?.description;
  }

  if (!title || !description) return privateRouteMetadata("Page not found");
  return publicRouteMetadata({ title, description, path: canonical, type });
}
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  const route = path.join("/");
  if (["login", "signup", "forgot-password", "reset-password"].includes(route))
    return <AuthForm mode={route} />;
  if (route === "onboarding") return <Onboarding />;
  if (route === "_not-found")
    return (
      <div className="page-wrap">
        <h1>This update isn’t here.</h1>
        <p>It may have moved or may not be published yet.</p>
      </div>
    );
  if (route === "about" || route === "disclaimer")
    return <AboutPage privacy={route === "disclaimer"} />;
  if (["editorial-policy", "privacy", "terms", "contact"].includes(route))
    return <TrustPage kind={route as "editorial-policy" | "privacy" | "terms" | "contact"} />;
  if (
    path[0] === "admin" &&
    path.length <= 2 &&
    (!path[1] ||
      ["notices", "deadlines", "sources", "review", "ingestion"].includes(
        path[1],
      ))
  )
    return <Admin section={path[1] || "overview"} />;
  if (route === "app/locations")
    return (
      <AccountGate>
        <LocationsPage />
      </AccountGate>
    );
  if (route === "app/locations/new")
    return (
      <AccountGate>
        <div className="page-wrap narrow">
          <h1>Add a place</h1>
          <div className="panel">
            <LocationForm />
          </div>
        </div>
      </AccountGate>
    );
  if (route === "app/alerts")
    return (
      <AccountGate>
        <div className="page-wrap narrow">
          <h1>Alert preferences</h1>
          <div className="panel">
            <PreferencesForm />
          </div>
        </div>
      </AccountGate>
    );
  if (route === "app/settings")
    return (
      <AccountGate>
        <SettingsPage />
      </AccountGate>
    );
  if (!isKnownContentRoute(path)) notFound();
  if (route === "paris-ontario") return <ParisOntarioResourceHub />;
  if (path[0] === "notice" && path.length === 2) {
    const notice = await noticeBySlug(path[1]);
    if (!notice) notFound();
    const data = await publicData();
    return (
      <NoticeDetail
        notice={notice}
        source={data.sources.find((s) => s.id === notice.source_id)}
      />
    );
  }
  if (path[0] === "deadline" && path.length === 2) {
    const deadline = await deadlineById(path[1]);
    if (!deadline) notFound();
    return <DeadlinesPage deadlines={[deadline]} detail />;
  }
  const data = await publicData();
  if (data.error)
    return (
      <div className="page-wrap">
        <h1>We couldn’t load local updates.</h1>
        <p>
          Please try again shortly. Original source links remain available at
          the County of Brant website.
        </p>
      </div>
    );
  if (route === "storm") return <StormPage {...data} />;
  if (route === "sources") return <SourcesPage sources={data.sources} />;
  if (route === "deadlines" || route === "app/deadlines") {
    const content = (
      <DeadlinesPage
        deadlines={data.deadlines}
        personal={route.startsWith("app")}
      />
    );
    return route.startsWith("app") ? (
      <AccountGate>{content}</AccountGate>
    ) : (
      content
    );
  }
  const modes: Record<string, string> = {
    "": "home",
    today: "today",
    map: "map",
    events: "events",
    app: "app",
    "app/feed": "feed",
    "app/map": "personal-map",
    "app/saved": "saved",
  };
  const feed = <Feed {...data} mode={modes[route]} />;
  return path[0] === "app" ? <AccountGate>{feed}</AccountGate> : feed;
}
