"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { filterServices, residentServices } from "@/data/resident-services";
import { ShareButton } from "./share-button";
import "./resident-guide.css";

export function ResidentServices() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const services = filterServices(query, category);
  return (
    <div className="page-wrap resident-guide">
      <span className="eyebrow">PRACTICAL HELP, OFFICIAL SOURCES</span>
      <h1>Everyday services in Paris, Ontario</h1>
      <p className="page-intro">
        Less searching through menus. Find the right place to book a ride, check
        collection, join a program or get help.
      </p>
      <div className="action-row resource-share-row">
        <ShareButton
          base={process.env.NEXT_PUBLIC_APP_URL || "https://parispulse.ca"}
          publicPath="/services"
          title="Everyday services in Paris, Ontario"
        />
      </div>
      <div className="message-box">
        These links open external service providers. Paris Pulse does not
        process bookings, payments or reports. For a medical emergency, call{" "}
        <a href="tel:911">911</a>.
      </div>
      <div className="guide-controls">
        <label>
          Search services
          <input
            type="search"
            value={query}
            placeholder="Try trash, bus, library or doctor"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Service category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {[...new Set(residentServices.map((s) => s.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button
          className="button outline"
          onClick={() => {
            setQuery("");
            setCategory("all");
          }}
        >
          Clear filters
        </button>
      </div>
      <p role="status" aria-live="polite">
        {services.length} {services.length === 1 ? "service" : "services"} found
      </p>
      {services.length === 0 && (
        <div className="panel">
          <h2>No services match those filters.</h2>
          <p>
            Try a shorter search or clear the category. Looking for a closure or
            event?{" "}
            <Link className="text-link" href="/today">
              Check local updates
            </Link>
            .
          </p>
        </div>
      )}
      <div className="guide-grid">
        {services.map((service) => (
          <article
            className="panel service-card"
            key={service.id}
            id={service.id}
          >
            <span className="card-eyebrow">{service.category}</span>
            <h2>{service.title}</h2>
            <p>{service.description}</p>
            <a
              className="text-link"
              href={service.url}
              target="_blank"
              rel="noreferrer"
            >
              {service.action}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <small className="guide-provenance">
              Source: {service.organization}
              <br />
              Link and description reviewed{" "}
              <time dateTime={service.checkedAt}>{service.checkedAt}</time>. Not
              live service status.
            </small>
          </article>
        ))}
      </div>
      <div className="panel guide-next">
        <h2>Just moved here?</h2>
        <p>Work through the essentials at your own pace. No account needed.</p>
        <Link className="button primary" href="/new-to-paris">
          Open the newcomer checklist
        </Link>
      </div>
      <p>
        Information can change. Confirm current rules with the provider.{" "}
        <Link className="text-link" href="/contact">
          Suggest a service or report an outdated link
        </Link>
        .
      </p>
    </div>
  );
}

const checklist = [
  {
    id: "address",
    title: "Update your provincial documents",
    note: "Start with ServiceOntario's requirements for the documents you hold. Each document can have a different deadline.",
  },
  {
    id: "waste",
    title: "Find your collection schedule",
    note: "Look up your own address rather than assuming everyone in Paris has the same pickup day.",
  },
  {
    id: "library",
    title: "Explore library membership",
    note: "Review the identification requirements and choose a branch visit or an online-only membership.",
  },
  {
    id: "transit",
    title: "Plan a local trip",
    note: "Check Brant Transit's booking rules and service area before you need a ride.",
  },
  {
    id: "recreation",
    title: "Find an activity that fits",
    note: "Browse recreation programs for your household and check availability with the provider.",
  },
  {
    id: "tax",
    title: "Review property tax arrangements, if applicable",
    note: "If you own your home, confirm your bill and payment arrangements. If this does not apply, mark it complete and move on.",
  },
];
const storageKey = "paris-pulse-newcomer-v1";

export function NewcomerChecklist() {
  const [done, setDone] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(storageKey) || "[]",
      );
      if (Array.isArray(saved))
        setDone([
          ...new Set(
            saved.filter(
              (id): id is string =>
                typeof id === "string" &&
                checklist.some((item) => item.id === id),
            ),
          ),
        ]);
    } catch {
      setStorageAvailable(false);
    }
    setReady(true);
  }, []);
  function update(next: string[]) {
    setDone(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }
  return (
    <div className="page-wrap resident-guide">
      <span className="eyebrow">YOUR FIRST FEW WEEKS</span>
      <h1>New to Paris, Ontario? Start here.</h1>
      <p className="page-intro">
        A practical starting checklist for settling in. It is not a complete
        moving guide, and not every step will apply to your household.
      </p>
      <div className="message-box">
        Paris is in the County of Brant, which is separate from the City of
        Brantford. Unsure which municipality serves your address? Check the{" "}
        <a
          href="https://webforms.brant.ca/Report-a-Problem"
          target="_blank"
          rel="noreferrer"
        >
          County’s address-map guidance
        </a>
        .
      </div>
      <section
        className="panel checklist-progress"
        aria-label="Checklist progress"
      >
        <p role="status" aria-live="polite">
          {done.length} of {checklist.length} completed
        </p>
        <progress
          aria-label="Steps completed"
          value={done.length}
          max={checklist.length}
        />
        <p>
          {storageAvailable
            ? "Progress is saved only in this browser, not to an account. Clearing browser data removes it."
            : "Browser storage is unavailable or could not be read. Changes may last only until you leave this page."}
        </p>
        <button
          disabled={!ready || done.length === 0}
          className="button outline"
          onClick={() => update([])}
        >
          Reset checklist
        </button>
      </section>
      <div className="newcomer-steps">
        {checklist.map((item) => {
          const service = residentServices.find((s) => s.id === item.id)!;
          return (
            <article className="panel" key={item.id}>
              <label className="check-row">
                <input
                  type="checkbox"
                  disabled={!ready}
                  checked={done.includes(item.id)}
                  onChange={(e) =>
                    update(
                      e.target.checked
                        ? [...done, item.id]
                        : done.filter((id) => id !== item.id),
                    )
                  }
                />
                <span>{item.title}</span>
              </label>
              <p>{item.note}</p>
              <a
                className="text-link"
                href={service.url}
                target="_blank"
                rel="noreferrer"
              >
                {service.action}
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
              <small className="guide-provenance">
                {service.organization} · Reviewed{" "}
                <time dateTime={service.checkedAt}>{service.checkedAt}</time>
              </small>
            </article>
          );
        })}
      </div>
      <div className="panel">
        <h2>Keep the useful things close</h2>
        <div className="action-row">
          <Link className="button primary" href="/services">
            Find everyday services
          </Link>
          <Link className="button outline" href="/storm">
            Storm & disruption resources
          </Link>
          <Link className="button outline" href="/events">
            Explore local events
          </Link>
        </div>
      </div>
    </div>
  );
}
