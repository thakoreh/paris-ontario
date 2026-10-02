"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bell,
  Bookmark,
  CalendarDays,
  CloudLightning,
  Compass,
  Home,
  Map,
  MapPin,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { usePersonal } from "./provider";
import "./neighbourhood.css";

const destinations = [
  ["/today", "Today", Home],
  ["/map", "Explore", Compass],
  ["/share-update", "Share", Plus],
  ["/app/area", "My area", MapPin],
] as const;
const allPages = [
  ["/today", "Today in Paris", Home],
  ["/map", "Explore the map", Map],
  ["/events", "Events & activities", CalendarDays],
  ["/deadlines", "Upcoming deadlines", CalendarDays],
  ["/storm", "Storm & disruption", CloudLightning],
  ["/services", "Everyday services", ShieldCheck],
  ["/new-to-paris", "New to Paris", Home],
  ["/paris-ontario", "Paris resource guide", Compass],
  ["/app/saved", "Saved notices", Bookmark],
  ["/app/locations", "My locations", MapPin],
  ["/app/alerts", "Alert preferences", Bell],
  ["/notifications", "Browser notifications", Bell],
  ["/app/settings", "Account settings", Settings],
] as const;
function isCurrent(path: string, href: string) {
  if (href === "/today") return ["/", "/today", "/app"].includes(path);
  if (href === "/map")
    return ["/map", "/app/map", "/app/feed", "/events"].includes(path);
  if (href === "/app/area")
    return [
      "/app/area",
      "/onboarding",
      "/app/locations",
      "/app/locations/new",
      "/app/alerts",
      "/notifications",
      "/app/settings",
    ].includes(path);
  return href === path;
}
function PageMenu({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  return (
    <div
      className="page-menu"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          toggle.current?.focus();
        }
      }}
    >
      <button
        ref={toggle}
        type="button"
        className="button outline"
        aria-label="Browse all pages"
        aria-expanded={open}
        aria-controls="all-pages-menu"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={18} /> : <Menu size={18} />} <span>Menu</span>
      </button>
      <nav id="all-pages-menu" aria-label="All pages" hidden={!open}>
        <p className="nav-label">LOCAL TOOLS & YOUR SETTINGS</p>
        {allPages.map(([href, label, Icon]) => (
          <Link
            href={href}
            key={href}
            aria-current={
              path === href ||
              (href === "/today" && ["/", "/app"].includes(path)) ||
              (href === "/map" && path === "/app/map")
                ? "page"
                : undefined
            }
            onClick={() => setOpen(false)}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
export function AreaContextBar() {
  const p = usePersonal();
  const hasPlaces = p.locations.length > 0;
  const nearby = hasPlaces && p.areaScope !== "all";
  const label = p.locations.length === 1 ? p.locations[0].label : "My places";
  return (
    <section className="area-context" aria-label="Your feed area">
      <div className="area-context-label">
        <MapPin size={19} />
        <div>
          <strong>
            {!p.ready
              ? "Loading your area…"
              : nearby
                ? label
                : "Paris, Ontario"}
          </strong>
          <span>
            {nearby
              ? p.preferences.radius_km === 0
                ? "All Paris radius"
                : `${p.preferences.radius_km} km radius`
              : "Exploring all Paris"}
          </span>
        </div>
      </div>
      {hasPlaces && (
        <div
          className="area-scope-control"
          role="group"
          aria-label="Area scope"
        >
          <button
            aria-pressed={nearby}
            onClick={() => p.setAreaScope("nearby")}
          >
            My area
          </button>
          <button aria-pressed={!nearby} onClick={() => p.setAreaScope("all")}>
            All Paris
          </button>
        </div>
      )}
      <Link className="area-edit" href="/app/area">
        {hasPlaces ? "Edit area & interests" : "Set my area"}
        <ArrowRight size={15} />
      </Link>
      <span className="area-privacy">
        <ShieldCheck size={13} />
        Your places aren’t public
      </span>
    </section>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || "/";
  const p = usePersonal();
  const showArea = [
    "/",
    "/today",
    "/map",
    "/events",
    "/app",
    "/app/feed",
    "/app/map",
    "/app/saved",
  ].includes(path);
  return (
    <div className="neighbourhood-shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="site-body">
        <header className="topbar neighbourhood-topbar">
          <Link className="brand" href="/today" aria-label="Paris Pulse home">
            <span className="brand-icon">
              <Activity size={22} />
            </span>
            paris<span className="brand-light">pulse</span>
            <span className="brand-dot">.</span>
          </Link>
          <nav className="primary-navigation" aria-label="Main navigation">
            {destinations.map(([href, label, Icon]) => (
              <Link
                key={href}
                href={href}
                aria-current={isCurrent(path, href) ? "page" : undefined}
              >
                <Icon size={17} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="header-tools">
            <Link
              className="button outline saved-entry"
              href="/app/saved"
              aria-label="Saved notices"
            >
              <Bookmark size={19} />
              <span>Saved</span>
            </Link>
            <PageMenu key={path} path={path} />
          </div>
        </header>
        {p.demo && process.env.NEXT_PUBLIC_PARIS_PULSE_TEST_MODE !== "1" && (
          <div className="demo-banner">
            <span>
              <strong>Sample data</strong>You’re exploring a demo. Notices and
              deadlines are fictional.
            </span>
            <Link href="/about">How it works</Link>
          </div>
        )}
        {showArea && <AreaContextBar />}
        <main id="main">{children}</main>
        <footer>
          <div className="footer-intro">
            <strong>Paris Pulse</strong>
            <span>Useful local information. Original sources. Your area.</span>
          </div>
          <div>
            <Link href="/services">Services</Link>
            <Link href="/deadlines">Deadlines</Link>
            <Link href="/new-to-paris">New to Paris</Link>
            <Link href="/sources">Sources</Link>
            <Link href="/about">About</Link>
            <Link href="/editorial-policy">Editorial policy</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <p>
            © {new Date().getFullYear()} Paris Pulse. Information can change.
            Verify important details with the original source. Paris Pulse is
            not an official County of Brant service or an emergency warning
            service.
          </p>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {destinations.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            aria-current={isCurrent(path, href) ? "page" : undefined}
          >
            <Icon size={21} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
