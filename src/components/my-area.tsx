"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MapPin, ShieldCheck } from "lucide-react";
import { categories, categoryLabels, type Category, type Notice } from "@/types";
import { defaultPreferences } from "@/config/community";
import { scoreNotice } from "@/lib/relevance";
import { usePersonal } from "./provider";
import { LocationForm } from "./account";
import { BrowserNotifications } from "./browser-notifications";
import { MapPanel } from "./map-panel";
import "./area-setup.css";

const steps = ["Choose area", "See your preview", "Your interests", "Browser alerts"];
export function MyArea({ notices, unavailable = false }: { notices: Notice[]; unavailable?: boolean }) {
  const p = usePersonal();
  const [step, setStep] = useState(0);
  const [adding, setAdding] = useState(false);
  const [radius, setRadius] = useState(p.preferences.radius_km);
  const [interests, setInterests] = useState<Category[]>(p.preferences.categories_json);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const matches = notices.filter((notice) => !p.dismissed.includes(notice.id) && scoreNotice(notice, p.locations, p.locations.length ? p.preferences : defaultPreferences));
  async function advance(kind: "radius" | "interests") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await p.savePreferences({ ...p.preferences, ...(kind === "radius" ? { radius_km: radius } : { categories_json: interests }) });
      if (kind === "radius") p.setAreaScope(p.locations.length ? "nearby" : "all");
      setStep(kind === "radius" ? 1 : 3);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save. Please retry."); }
    finally { setBusy(false); }
  }
  return <div className="page-wrap area-setup">
    <div className="page-heading"><div><span className="eyebrow">MY AREA · PRIVATE BY DESIGN</span><h1>Make Paris feel local.</h1><p>Choose the places and updates that matter to you. Browser alerts are optional.</p></div><Link className="text-link" href="/today">Back to Today</Link></div>
    <ol className="area-steps" aria-label="Set up your area">{steps.map((name, i) => <li key={name} aria-current={step === i ? "step" : undefined}><span>{i + 1}</span>{name}</li>)}</ol>
    <p className="area-storage-note"><ShieldCheck size={17} />{p.guest ? "Your guest places and preferences stay in this browser. They are not transferred when you sign in." : "Your saved places are private to your account. Your visit history stays in this browser."}</p>
    <section className="panel area-step-panel" aria-label={steps[step]}>
      {step === 0 && <><h2>Choose your area</h2><p>A street or nearby public landmark is enough. You do not need to save your exact home address. Address searches use Photon (Komoot); map tiles use OpenStreetMap.</p>
        {p.locations.length > 0 && <div className="area-place-list">{p.locations.map(place => <div key={place.id}><MapPin size={19} /><strong>{place.label}</strong><span>{place.address_line}</span></div>)}<Link className="text-link" href="/app/locations">Manage saved places</Link></div>}
        {(!p.locations.length || adding) ? <LocationForm onDone={() => { setAdding(false); p.setAreaScope("nearby"); }} /> : <button className="button outline" onClick={() => setAdding(true)}>Add another place</button>}
        {adding && <button className="button outline" onClick={() => setAdding(false)}>Cancel adding a place</button>}
        <fieldset className="area-radius"><legend>How far around your places?</legend><div className="radius-options">{[0.5, 1, 3, 5, 0].map(r => <button key={r} type="button" aria-pressed={radius === r} className={radius === r ? "selected" : ""} onClick={() => setRadius(r)}>{r === 0 ? "All Paris" : r === 0.5 ? "500 m" : `${r} km`}</button>)}</div></fieldset>
        <p>Without a saved place, your preview covers all Paris. Browser alerts will still need a saved place on your account.</p>
        <button className="button primary" disabled={busy} onClick={() => void advance("radius")}>{busy ? "Saving…" : "Save radius & preview"}<ArrowRight size={16} /></button>
      </>}
      {step === 1 && <><h2>Your local preview</h2><p>{p.locations.length ? `${p.preferences.radius_km === 0 ? "All Paris" : `${p.preferences.radius_km} km around your saved places`}.` : "Exploring all Paris."} This uses the same saved area as Today and Explore. Interests prioritize your feed; browser alerts use a strict interest filter.</p>
        {unavailable ? <p role="status">Local updates could not be loaded. Your area is saved; retry the preview later.</p> : <><div className="area-preview-map"><MapPanel notices={matches} /></div><p>{matches.length} current {matches.length === 1 ? "update matches" : "updates match"} this area and importance setting. Public maps show notice locations, never your saved places.</p><ul className="area-preview-list">{matches.slice(0, 3).map(notice => <li key={notice.id}><span>{categoryLabels[notice.category]}</span><Link href={`/notice/${notice.slug}`}>{notice.title}</Link></li>)}</ul>{!matches.length && <p>No matching updates right now. That does not establish that the area is clear of disruptions.</p>}</>}
        <button className="button primary" onClick={() => setStep(2)}>Continue to interests<ArrowRight size={16} /></button>
      </>}
      {step === 2 && <><h2>What matters to you?</h2><p>Choose the topics you want to hear about. You can browse without choosing any; push notifications require at least one.</p><div className="interest-grid">{categories.map(category => <label key={category} className={interests.includes(category) ? "interest selected" : "interest"}><input type="checkbox" checked={interests.includes(category)} onChange={event => setInterests(event.target.checked ? [...interests, category] : interests.filter(value => value !== category))} />{categoryLabels[category]}</label>)}</div><button className="button primary" disabled={busy} onClick={() => void advance("interests")}>{busy ? "Saving…" : "Save interests"}<ArrowRight size={16} /></button></>}
      {step === 3 && <><BrowserNotifications embedded /><Link className="button primary" href="/today">Finish and explore<ArrowRight size={16} /></Link></>}
      {error && <p className="error" role="alert">{error}</p>}
      {step > 0 && <button className="button outline setup-back" disabled={busy} onClick={() => { setError(""); setStep(step - 1); }}><ArrowLeft size={16} />Back</button>}
    </section>
    <div className="area-advanced"><Link href="/app/alerts">Importance, quiet hours & delivery settings</Link><Link href="/app/settings">Account & browser data</Link><Link href="/privacy">Privacy details</Link></div>
  </div>;
}
