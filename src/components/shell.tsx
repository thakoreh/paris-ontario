"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bookmark,
  CalendarDays,
  Compass,
  Home,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { usePersonal } from "./provider";
import "./neighbourhood.css";

const destinations = [
  ["/", "Today", Home],
  ["/events", "Events", CalendarDays],
  ["/explore", "Explore", Compass],
  ["/services", "Services", ShieldCheck],
] as const;
function isCurrent(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/explore" && path === "/app/map") return true;
  return path === href || path.startsWith(`${href}/`);
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
    "/events",
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
          <Link className="brand" href="/" aria-label="Paris Pulse home">
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
              prefetch={false}
              aria-label="Saved notices"
            >
              <Bookmark size={19} />
              <span>Saved</span>
            </Link>
            <Link
              className="button outline profile-entry"
              href="/profile"
              aria-label="Your profile"
            >
              <UserRound size={22} />
            </Link>
          </div>
        </header>
        {p.demo && process.env.NEXT_PUBLIC_PARIS_PULSE_TEST_MODE !== "1" && (
          <aside className="demo-banner" aria-label="Sample data">
            <span>
              <strong>Sample data</strong>You’re exploring a demo. Notices and
              deadlines are fictional.
            </span>
            <Link href="/about">How it works</Link>
          </aside>
        )}
        {showArea && <AreaContextBar />}
        <main id="main">{children}</main>
        <footer>
          <div className="footer-intro">
            <strong>Paris Pulse</strong>
            <span>Useful local information. Original sources. Your area.</span>
          </div>
          <div>
            <Link href="/sources">Sources</Link>
            <Link href="/about">About</Link>
            <Link href="/editorial-policy">Editorial policy</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/share-update">Share an update</Link>
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
