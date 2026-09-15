import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { publicData, noticeBySlug, deadlineById } from "@/lib/repository";
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
  if (route === "_not-found") {
    return {
      title: "Update not found",
      robots: { index: false, follow: false },
    };
  }
  const title =
    path[0] === "notice"
      ? (await noticeBySlug(path[1]))?.title
      : path[0] === "deadline"
        ? (await deadlineById(path[1]))?.title
        : (
            {
              today: "Today in Paris",
              storm: "Storm & disruption",
              deadlines: "Upcoming deadlines",
              events: "Paris Ontario events",
              map: "Local notice map",
              sources: "Our sources",
              about: "About Paris Pulse",
              "editorial-policy": "Editorial policy",
              privacy: "Privacy",
              terms: "Terms of use",
              contact: "Contact and corrections",
            } as Record<string, string>
          )[path[0]];
  const privateRoute = [
    "app",
    "admin",
    "login",
    "signup",
    "forgot-password",
    "reset-password",
    "onboarding",
  ].includes(path[0]);
  const canonical =
    route === "disclaimer" ? "/privacy" : route ? `/${route}` : "/";
  return {
    title: title || "Know what changed around you",
    description:
      route === "editorial-policy"
        ? "How Paris Pulse verifies, corrects and expires local information for Paris, Ontario."
        : route === "sources"
          ? "Named sources, review status and source transparency for Paris Pulse."
          : undefined,
    alternates: privateRoute ? undefined : { canonical },
    robots: privateRoute ? { index: false, follow: false } : undefined,
  };
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
