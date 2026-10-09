"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { categoryLabels } from "@/types";
import { communitySubmissionSchema, reviewChecks, submissionAreas, submissionCategories, type CommunitySubmission, type ReviewChecks } from "@/lib/community-submissions";
import { buildCommunityEmailDraft } from "@/lib/community-email";
import { usePersonal } from "./provider";
import { CommunityEmailDraft } from "./community-email-draft";
import "./contributions.css";

type Draft = { title: string; body: string; category: string; area: string; source_url: string; public_details_only: boolean; website: string };
const emptyDraft: Draft = { title: "", body: "", category: "public_notice", area: "all-paris", source_url: "", public_details_only: false, website: "" };
export function CommunitySubmissionForm() {
  const [accepting, setAccepting] = useState<boolean | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [preview, setPreview] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    fetch("/api/community-submissions", { cache: "no-store" }).then(async response => {
      const data = await response.json();
      if (active) setAccepting(response.ok && data.accepting === true);
    }).catch(() => { if (active) setAccepting(false); });
    return () => { active = false; };
  }, []);
  const field = (name: keyof Draft, value: string | boolean) => setDraft(current => ({ ...current, [name]: value }));
  async function submit() {
    if (inFlight.current || !accepting || sent) return;
    const parsed = communitySubmissionSchema.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Check the details and retry."); return; }
    inFlight.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/community-submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const data = await response.json();
      if (!response.ok || data.status !== "pending") throw Error(data.error || "We could not confirm receipt. Please wait before retrying.");
      setSent(true); setDraft(emptyDraft);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to send. Your draft is still here; please retry later."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <div className="page-wrap contribution-page">
    <div className="contribution-heading"><span className="eyebrow">FROM NEIGHBOURS · CHECKED BY EDITORS</span><h1>Share a local update</h1><p>A new business, an event, a useful change. Help us find the original source so an editor can check it.</p></div>
    <div className="contribution-layout"><section className="panel contribution-form" aria-label="Share a local update">
      {sent ? <div className="submission-receipt" role="status"><CheckCircle2 size={34} /><h2>Thanks. Your update is pending editor review.</h2><p>It has not been published or sent as an alert. Editors verify the source, details and local relevance before deciding what to include. Publication and review timing are not guaranteed.</p><Link className="button primary" href="/today">Back to Today</Link></div> : <>
        {accepting === null && <p role="status">Checking whether submissions are available…</p>}
        {accepting === false && <p className="message-box" role="status">Private submissions are not available in this environment yet. After you validate a preview, you can optionally prepare a voluntary email instead; opening it sends nothing.</p>}
        {!preview ? <form onSubmit={event => {
          event.preventDefault(); setError("");
          const parsed = communitySubmissionSchema.safeParse(draft);
          if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Check your update."); return; }
          setPreview(true);
        }}>
          <label>Update title<input value={draft.title} onChange={e => field("title", e.target.value)} minLength={8} maxLength={140} required placeholder="A short, factual description" /></label>
          <label>What should neighbours know?<textarea value={draft.body} onChange={e => field("body", e.target.value)} minLength={20} maxLength={2000} rows={6} required placeholder="What is changing, where and when? Include only details supported by your source." /></label>
          <div className="two-grid"><label>Category<select value={draft.category} onChange={e => field("category", e.target.value)}>{submissionCategories.map(category => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></label><label>Area<select value={draft.area} onChange={e => field("area", e.target.value)}>{Object.entries(submissionAreas).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
          <label>Original source URL<input type="url" value={draft.source_url} onChange={e => field("source_url", e.target.value)} maxLength={2048} required placeholder="https://…" /></label>
          <p className="form-help">Use a public announcement from the organizer, business or responsible agency. Private-group posts, account links and sign-in tokens do not belong here.</p>
          <div className="submission-honeypot" aria-hidden="true"><label>Website<input value={draft.website} onChange={e => field("website", e.target.value)} autoComplete="off" tabIndex={-1} /></label></div>
          <label className="check-row"><input type="checkbox" checked={draft.public_details_only} onChange={e => field("public_details_only", e.target.checked)} required />This contains public details only, with no private home information, personal accusations or unnecessary personal data.</label>
          <button className="button primary" type="submit">Review my update<ArrowRight size={16} /></button>
        </form> : <div className="submission-preview"><span className="eyebrow">YOUR PREVIEW · NOT PUBLISHED</span><h2>{draft.title}</h2><p className="submission-body">{draft.body}</p><dl><div><dt>Category</dt><dd>{categoryLabels[draft.category as keyof typeof categoryLabels]}</dd></div><div><dt>Area</dt><dd>{submissionAreas[draft.area as keyof typeof submissionAreas]}</dd></div></dl><a className="text-link" href={draft.source_url} target="_blank" rel="noopener noreferrer">Check original source</a><p>{accepting === true ? "Sending adds this update to a private editor queue. An editor must check the facts before any separate publication decision." : "The private queue is unavailable, so nothing will be submitted here."}</p><div className="action-row"><button className="button outline" disabled={busy} onClick={() => { setPreview(false); setError(""); }}><ArrowLeft size={16} />Back to edit</button><button className="button primary" disabled={busy || accepting !== true} onClick={() => void submit()}>{busy ? "Sending…" : "Send for editor review"}<ArrowRight size={16} /></button></div>{accepting === false && <CommunityEmailDraft draft={buildCommunityEmailDraft({ title: draft.title, body: draft.body, sourceUrl: draft.source_url })} heading="Prepare an email instead" actionLabel="Open email draft" description="This is a voluntary email path, separate from the private database queue. Opening the draft sends nothing; review it in your own email app before choosing whether to send. Your sender address and email provider are involved, and response or publication is not guaranteed." />}</div>}
      </>}
      {error && <p role="alert" className="error">{error}</p>}
    </section><aside className="contribution-aside"><ShieldCheck size={25} /><h2>A useful tip starts with a source.</h2><ol><li>Share public, local information</li><li>An editor checks the source and facts</li><li>Only approved information can be published separately</li></ol><p>No account or contact information is needed. The private queue uses only the public details you provide. If you choose the separate email path while the queue is unavailable, your email app supplies your sender address and provider; opening the draft sends nothing.</p><p>This is not an emergency reporting service and is not monitored continuously. For an emergency, call 911 and follow official authorities.</p><Link href="/editorial-policy">Our editorial policy</Link><Link href="/privacy">Privacy details</Link></aside></div>
  </div>;
}

export function SubmissionReviewQueue() {
  const p = usePersonal();
  const [status, setStatus] = useState<CommunitySubmission["status"]>("pending");
  const [offset, setOffset] = useState(0);
  const requestSequence = useRef(0);
  const [rows, setRows] = useState<CommunitySubmission[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const canReview = !!p.profile && ["editor", "admin"].includes(p.profile.role);
  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/submissions?status=${status}&offset=${offset}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Unable to load submissions.");
      if (sequence === requestSequence.current) setRows(data.submissions);
    } catch (e) { if (sequence === requestSequence.current) { setError(e instanceof Error ? e.message : "Unable to load submissions."); setRows([]); } }
    finally { if (sequence === requestSequence.current) setLoading(false); }
  }, [status, offset]);
  useEffect(() => { if (p.ready && canReview) void load(); }, [p.ready, canReview, load]);
  if (!p.ready) return <div className="page-wrap">Checking editor access…</div>;
  if (!canReview) return <div className="page-wrap narrow"><section className="panel"><ShieldCheck /><h1>Editor access required</h1><p>Sign in with an editor or admin account to review private submissions.</p><Link className="button primary" href="/login">Sign in</Link></section></div>;
  return <div className="page-wrap contribution-page"><span className="eyebrow">PRIVATE EDITORIAL QUEUE</span><h1>Community submissions</h1><p>Submissions are unverified leads. Marking one ready records editorial checks only. It never creates a public notice or sends notifications.</p><Link className="text-link" href="/admin">Back to editorial workspace</Link><label className="submission-status-filter">Review status<select value={status} onChange={e => { setStatus(e.target.value as CommunitySubmission["status"]); setOffset(0); }}><option value="pending">Pending</option><option value="ready">Ready for separate publication review</option><option value="rejected">Rejected</option></select></label>{loading ? <p role="status">Loading submissions…</p> : rows.length ? rows.map(row => <SubmissionReviewItem key={row.id} row={row} onDone={load} />) : !error && <p>No submissions in this view.</p>}{!loading && !error && <nav aria-label="Submission pages" className="action-row"><button className="button outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 25))}>Previous submissions</button><span>Page {Math.floor(offset / 25) + 1}</span><button className="button outline" disabled={rows.length < 25} onClick={() => setOffset(offset + 25)}>Next submissions</button></nav>}{error && <div role="alert"><p>{error}</p><button className="button outline" onClick={() => void load()}>Retry</button></div>}</div>;
}
function SubmissionReviewItem({ row, onDone }: { row: CommunitySubmission; onDone: () => Promise<void> }) {
  const [checks, setChecks] = useState<ReviewChecks>({ source_verified: false, geography_verified: false, facts_verified: false, privacy_checked: false, ...row.review_checks });
  const [notes, setNotes] = useState(row.review_notes || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function review(status: "ready" | "rejected") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/submissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, status, review_notes: notes, review_checks: checks }) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Unable to record review.");
      await onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to record review."); }
    finally { setBusy(false); }
  }
  return <article className="panel submission-review-item"><span className="eyebrow">{row.status.toUpperCase()} · {submissionAreas[row.area]}</span><h2>{row.title}</h2><p className="submission-body">{row.body}</p><a className="text-link" href={row.source_url} rel="noopener noreferrer" target="_blank">Open submitted source</a><p>Submitted {new Date(row.created_at).toLocaleString("en-CA", { timeZone: "America/Toronto" })} (Toronto time)</p><fieldset><legend>Required editorial checks</legend>{Object.entries(reviewChecks).map(([key, label]) => <label className="check-row" key={key}><input type="checkbox" checked={checks[key as keyof ReviewChecks]} onChange={e => setChecks({ ...checks, [key]: e.target.checked })} disabled={busy || row.status !== "pending"} />{label}</label>)}</fieldset><label>Review notes<textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} minLength={10} maxLength={2000} disabled={busy || row.status !== "pending"} /></label>{row.status === "pending" && <div className="action-row"><button className="button primary" disabled={busy || notes.trim().length < 10 || !Object.values(checks).every(Boolean)} onClick={() => void review("ready")}>Mark ready for publication review</button><button className="button outline" disabled={busy || notes.trim().length < 10} onClick={() => void review("rejected")}>Reject submission</button></div>}{error && <p className="error" role="alert">{error}</p>}</article>;
}
