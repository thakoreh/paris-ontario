"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Bookmark,
  CalendarDays,
  ChevronDown,
  CloudLightning,
  Compass,
  Home,
  Map,
  MapPin,
  Newspaper,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { usePersonal } from "./provider";
const main = [
  ["/today", "Today in Paris", Home],
  ["/map", "Explore the map", Map],
  ["/deadlines", "Upcoming deadlines", CalendarDays],
  ["/storm", "Storm & disruption", CloudLightning],
  ["/events", "Events & activities", Compass],
] as const;
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const p = usePersonal();
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-icon">
            <Activity size={24} />
          </span>
          paris<span className="brand-light">pulse</span>
          <span className="brand-dot">.</span>
        </Link>
        <div className="community-switch">
          <MapPin size={17} />
          <div>
            <strong>Paris, Ontario</strong>
            <small>Your community, connected</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <span className="nav-label">AROUND YOU</span>
        <nav aria-label="Main navigation">
          {main.map(([href, label, Icon]) => (
            <Link
              className={path === href ? "active" : ""}
              href={href}
              key={href}
            >
              <Icon size={19} />
              {label}
              {href === "/storm" && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <span className="nav-label personal-label">YOUR PULSE</span>
        <nav aria-label="Personal navigation">
          {[
            ["/app", "My overview", SlidersHorizontal],
            ["/app/saved", "Saved notices", Bookmark],
            ["/app/locations", "My locations", MapPin],
            ["/app/alerts", "Alert preferences", Bell],
          ].map(([href, label, Icon]) => {
            const I = Icon as typeof Home;
            return (
              <Link
                href={href as string}
                key={href as string}
                className={path === href ? "active" : ""}
              >
                <I size={19} />
                {label as string}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="independent">
            <ShieldCheck size={22} />
            <strong>
              Local information.
              <br />
              Straight from the source.
            </strong>
            <p>Independent. Useful. Always transparent.</p>
            <Link href="/sources">
              Meet our sources <ArrowUpRight size={14} />
            </Link>
          </div>
          <Link className="account" href="/app/settings">
            <span className="avatar">{p.profile ? "P" : "↗"}</span>
            <span>
              <strong>
                {p.profile ? p.profile.full_name : "Make it yours"}
              </strong>
              <small>
                {p.profile ? "Manage your account" : "Saved in this browser"}
              </small>
            </span>
            <Settings size={17} />
          </Link>
        </div>
      </aside>
      <div className="site-body">
        <header className="topbar">
          <span className="topbar-label">
            <span className="live-dot" /> A little more in the know.
          </span>
          <Link href="/sources" className="top-source">
            <ShieldCheck size={15} /> Source transparency
          </Link>
          <Link href="/app" className="button primary small">
            My Pulse
            <ArrowUpRight size={15} />
          </Link>
        </header>
        {p.demo && (
          <div className="demo-banner">
            <span>
              <strong>Sample data</strong> You’re exploring a demo. Notices and
              deadlines are fictional.
            </span>
            <Link href="/about">
              How it works <ArrowUpRight size={12} />
            </Link>
          </div>
        )}
        <main id="main">{children}</main>
        <footer>
          <span>
            © {new Date().getFullYear()} Paris Pulse · Made for life around
            here.
          </span>
          <div>
            <Link href="/about">About</Link>
            <Link href="/sources">Sources</Link>
            <Link href="/disclaimer">Privacy & disclaimer</Link>
          </div>
          <p>
            Information can change. Verify important details with the original
            source. Paris Pulse is not an official County of Brant service.
          </p>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {[
          ["/app", "Home", Home],
          ["/today", "Feed", Newspaper],
          ["/map", "Map", Map],
          ["/app/saved", "Saved", Bookmark],
          ["/app/settings", "Settings", Settings],
        ].map(([href, label, Icon]) => {
          const I = Icon as typeof Home;
          return (
            <Link
              className={path === href ? "active" : ""}
              key={href as string}
              href={href as string}
            >
              <I size={21} />
              <span>{label as string}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
