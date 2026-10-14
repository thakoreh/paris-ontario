"use client";
import React from "react";
import Link from "next/link";
import { usePersonal } from "./provider";

const profileLinks = [
  ["/app/area", "My area"],
  ["/app/saved", "Saved"],
  ["/app/locations", "My locations"],
  ["/app/alerts", "Alerts"],
  ["/app/settings", "Account settings"],
] as const;

export function ProfileHub() {
  const personal = usePersonal();
  return (
    <div className="page-wrap narrow">
      <h1>Your profile</h1>
      {!personal.ready ? (
        <p>Loading your profile…</p>
      ) : personal.profile ? (
        <nav className="profile-links" aria-label="Profile tools">
          {profileLinks.map(([href, label]) => (
            <Link className="button outline" key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      ) : (
        <section className="panel">
          <h2>Sign in to your Paris Pulse</h2>
          <p>
            Manage your area, saved updates, locations, alerts and account
            settings.
          </p>
          <Link className="button primary" href="/login">
            Sign in
          </Link>
        </section>
      )}
      <Link className="button outline" href="/share-update">
        Share an update
      </Link>
    </div>
  );
}
