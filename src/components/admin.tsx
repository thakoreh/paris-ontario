"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Plus, ShieldCheck, Pencil, Copy, Search } from "lucide-react";
import type { Notice, Deadline, Source } from "@/types";
import { categories, categoryLabels } from "@/types";
import { formatDate } from "@/lib/utils";
import { noticeSchema, duplicateScore } from "@/lib/validation";
import { usePersonal } from "./provider";
import { EmptyState } from "./cards";
import { SendPushButton } from "./send-push-button";
export function Admin({ section }: { section: string }) {
  const p = usePersonal();
  const [data, setData] = useState<{
    notices: Notice[];
    deadlines: Deadline[];
    official_sources: Source[];
    ingestion_runs: Record<string, unknown>[];
    users: unknown[];
  } | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [query, setQuery] = useState("");
  async function load() {
    try {
      const r = await fetch("/api/admin");
      const d = await r.json();
      if (!r.ok) setError(d.error);
      else setData(d);
    } catch {
      setError("Unable to reach the editorial service. Please retry.");
    }
  }
  useEffect(() => {
    if (!p.ready) return;
    if (!p.profile || !["editor", "admin"].includes(p.profile.role)) {
      setError("Sign in with an editor or admin account to access this workspace.");
      return;
    }
    setError("");
    void load();
  }, [p.ready, p.profile]);
  if (error)
    return (
      <div className="page-wrap">
        <div className="panel">
          <ShieldCheck />
          <h1>Editor access required</h1>
          <p>{error}</p>
          <p>
            Admin access is never granted by a guest session. Configure Supabase,
            create an account, and assign its editor or admin role through the
            database.
          </p>
          <Link href="/login" className="button primary">
            Sign in
          </Link>
        </div>
      </div>
    );
  if (!data)
    return <div className="page-wrap">Loading editorial workspace…</div>;
  const table =
    section === "deadlines"
      ? "deadlines"
      : section === "sources"
        ? "official_sources"
        : "notices";
  const review = data.notices.filter(
    (n) =>
      n.verification_status === "needs_review" ||
      n.verification_status === "draft" ||
      n.latitude === null ||
      data.notices.some(
        (other) => other.id !== n.id && duplicateScore(n, other) > 0.8,
      ),
  );
  const rows = section === "review" ? review : data[table];
  async function save(row: Record<string, unknown>) {
    const r = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id: row.id, data: row }),
    });
    const result = await r.json();
    if (!r.ok) throw Error(result.error);
    setEditing(null);
    await load();
    p.notify("Saved to the editorial workspace.");
  }
  return (
    <div className="page-wrap">
      <div className="page-heading">
        <div>
          <span className="eyebrow">EDITORIAL WORKSPACE</span>
          <h1>
            {section === "overview"
              ? "Keep Paris in the know."
              : `Manage ${section}`}
          </h1>
          <p>
            Publish carefully. Keep sources visible. Verify the important
            details.
          </p>
        </div>
        <button className="button primary" onClick={() => setEditing({})}>
          <Plus size={16} />
          Create{" "}
          {table === "notices"
            ? "notice"
            : table === "deadlines"
              ? "deadline"
              : "source"}
        </button>
      </div>
      <nav className="admin-tabs">
        {[
          "overview",
          "notices",
          "deadlines",
          "sources",
          "review",
          "ingestion",
        ].map((s) => (
          <Link
            className={s === section ? "active" : ""}
            href={s === "overview" ? "/admin" : `/admin/${s}`}
            key={s}
          >
            {s}
          </Link>
        ))}
      </nav>
      {section === "overview" && (
        <div className="three-grid metrics">
          {[
            [
              "Verified notices",
              data.notices.filter((n) => n.verification_status === "verified")
                .length,
            ],
            ["Needs review", review.length],
            ["Deadlines", data.deadlines.length],
            ["Sources", data.official_sources.length],
            ["Users", data.users.length],
            ["Ingestion runs", data.ingestion_runs.length],
          ].map(([label, value]) => (
            <div className="panel" key={label}>
              <strong>{value}</strong>
              <p>{label}</p>
            </div>
          ))}
        </div>
      )}
      {section === "ingestion" ? (
        <div className="panel">
          <h2>Manual curation is active</h2>
          <p>
            Automated sources must be configured and reviewed before enabling
            ingestion. No live integration is being simulated.
          </p>
          {data.official_sources.map((s) => (
            <div className="source-row" key={s.id}>
              <strong>{s.name}</strong>
              <span>
                {s.last_success_at
                  ? formatDate(s.last_success_at)
                  : "Never ingested"}
              </span>
              <span>Manual · no retry needed</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="search-field admin-search">
            <Search size={17} />
            <input
              aria-label="Search editorial items"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items…"
            />
          </div>
          <div className="admin-list">
            {rows
              .filter((row) =>
                String("title" in row ? row.title : row.name)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((row) => (
                <article className="admin-row" key={row.id}>
                  <div>
                    <strong>{"title" in row ? row.title : row.name}</strong>
                    <small>
                      {"verification_status" in row
                        ? row.verification_status
                        : "is_sample" in row && row.is_sample
                          ? "Sample data"
                          : "Source reference"}
                    </small>
                  </div>
                  <button
                    className="button outline small"
                    onClick={() =>
                      setEditing(row as unknown as Record<string, unknown>)
                    }
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  {table === "notices" && (row as Notice).verification_status === "verified" && !(row as Notice).is_sample && <SendPushButton noticeId={row.id} />}
                  {table === "notices" && (
                    <>
                      <button
                        className="icon-button"
                        aria-label="Duplicate notice"
                        onClick={() =>
                          setEditing({
                            ...row,
                            id: undefined,
                            title: `${(row as Notice).title} (copy)`,
                            verification_status: "draft",
                          })
                        }
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        className="button outline small"
                        onClick={async () => {
                          const response = await fetch("/api/admin", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "preview",
                              id: row.id,
                            }),
                          });
                          const result = await response.json();
                          p.notify(
                            response.ok
                              ? `${result.count} residents currently match this notice. Private addresses remain hidden.`
                              : result.error,
                          );
                        }}
                      >
                        Match count
                      </button>
                      <select
                        aria-label="Set notice status"
                        value={(row as Notice).verification_status}
                        onChange={(e) =>
                          void save({
                            ...row,
                            verification_status: e.target.value,
                          }).catch((e) => p.notify(e.message))
                        }
                      >
                        {[
                          "draft",
                          "needs_review",
                          "verified",
                          "rejected",
                          "expired",
                        ].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                      {section === "review" && (
                        <select
                          aria-label="Merge duplicate into"
                          defaultValue=""
                          onChange={async (e) => {
                            if (!e.target.value) return;
                            const response = await fetch("/api/admin", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "merge",
                                keep_id: e.target.value,
                                duplicate_id: row.id,
                              }),
                            });
                            const result = await response.json();
                            if (response.ok) {
                              await load();
                              p.notify(
                                "Duplicate merged. Original target preserved.",
                              );
                            } else p.notify(result.error);
                          }}
                        >
                          <option value="">Merge into…</option>
                          {data.notices
                            .filter(
                              (n) =>
                                n.id !== row.id &&
                                duplicateScore(n, row as Notice) > 0.5,
                            )
                            .map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.title}
                              </option>
                            ))}
                        </select>
                      )}
                    </>
                  )}
                </article>
              ))}
            {!rows.length && (
              <EmptyState title="Ready for your first update." />
            )}
          </div>
        </>
      )}
      {editing && (
        <AdminEditor
          key={String(editing.id || "new")}
          table={table}
          initial={editing}
          sources={data.official_sources}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}
function AdminEditor({
  table,
  initial,
  sources,
  onClose,
  onSave,
}: {
  table: string;
  initial: Record<string, unknown>;
  sources: Source[];
  onClose: () => void;
  onSave: (row: Record<string, unknown>) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    return () => previous?.focus();
  }, []);

  return (
    <div className="modal-backdrop">
      <section
        className="editor-modal"
        ref={dialog}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Tab") {
            const elements = Array.from(
              dialog.current?.querySelectorAll<HTMLElement>(
                "button:not(:disabled), input, select, textarea, a[href]",
              ) || [],
            );
            const first = elements[0],
              last = elements[elements.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}

        role="dialog"
        aria-modal="true"
        aria-label="Edit content"
      >
        <div className="section-heading">
          <h2>
            {initial.id ? "Edit" : "Create"}{" "}
            {table === "official_sources"
              ? "source"
              : table === "notices"
                ? "notice"
                : "deadline"}
          </h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close editor"
          >
            ×
          </button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const f = new FormData(e.currentTarget);
            const row: Record<string, unknown> = { ...initial };
            f.forEach((v, k) => (row[k] = String(v)));
            try {
              if (table !== "official_sources") {
                row.is_sample = false;
                row.latitude = f.get("latitude")
                  ? Number(f.get("latitude"))
                  : null;
                row.longitude = f.get("longitude")
                  ? Number(f.get("longitude"))
                  : null;
                if (table === "notices") {
                  row.expires_at = f.get("expires_at")
                    ? new Date(String(f.get("expires_at"))).toISOString()
                    : null;
                  row.affected_radius_km = f.get("affected_radius_km")
                    ? Number(f.get("affected_radius_km"))
                    : null;
                  noticeSchema.parse(row);
                } else {
                  row.deadline_at = new Date(
                    String(f.get("deadline_at")),
                  ).toISOString();
                  row.verified_at =
                    f.get("verified") === "on"
                      ? new Date().toISOString()
                      : null;
                }
              } else row.active = f.get("active") === "on";
              await onSave(row);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Unable to save.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {table === "official_sources" ? (
            <>
              <label>
                Name
                <input
                  name="name"
                  required
                  defaultValue={String(initial.name || "")}
                />
              </label>
              <label>
                Organization
                <input
                  name="organization"
                  required
                  defaultValue={String(initial.organization || "")}
                />
              </label>
              <label>
                URL
                <input
                  name="url"
                  type="url"
                  required
                  defaultValue={String(initial.url || "https://")}
                />
              </label>
              <label>
                Authority
                <select
                  name="authority_level"
                  defaultValue={String(initial.authority_level || "official")}
                >
                  {[
                    "official",
                    "official_agency",
                    "trusted_local_org",
                    "trusted_media",
                    "community_signal",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  defaultValue={String(initial.description || "")}
                />
              </label>
              <label className="check-row">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={initial.active !== false}
                />
                Active
              </label>
            </>
          ) : (
            <>
              <label>
                Title
                <input
                  name="title"
                  required
                  minLength={5}
                  defaultValue={String(initial.title || "")}
                />
              </label>
              <label>
                {table === "notices" ? "Summary" : "Description"}
                <textarea
                  name={table === "notices" ? "summary" : "description"}
                  required
                  minLength={15}
                  defaultValue={String(
                    initial.summary || initial.description || "",
                  )}
                />
              </label>
              <div className="two-grid">
                <label>
                  Category
                  <select
                    name="category"
                    defaultValue={String(initial.category || "public_notice")}
                  >
                    {categories.map((c) => (
                      <option value={c} key={c}>
                        {categoryLabels[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Source
                  <select
                    name="source_id"
                    defaultValue={String(initial.source_id || sources[0]?.id)}
                  >
                    {sources.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Original source URL
                <input
                  name="official_url"
                  type="url"
                  required
                  defaultValue={String(initial.official_url || "https://")}
                />
              </label>
              <div className="two-grid">
                <label>
                  Latitude
                  <input
                    name="latitude"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    defaultValue={String(initial.latitude ?? "")}
                  />
                </label>
                <label>
                  Longitude
                  <input
                    name="longitude"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    defaultValue={String(initial.longitude ?? "")}
                  />
                </label>
              </div>
              {table === "notices" ? (
                <>
                  <div className="two-grid">
                    <label>
                      Importance
                      <select
                        name="severity"
                        defaultValue={String(initial.severity || "useful")}
                      >
                        {["info", "useful", "important", "urgent"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Status
                      <select
                        name="verification_status"
                        defaultValue={String(
                          initial.verification_status || "draft",
                        )}
                      >
                        {[
                          "draft",
                          "needs_review",
                          "verified",
                          "expired",
                          "rejected",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    Affected area
                    <input
                      name="affected_area_text"
                      defaultValue={String(
                        initial.affected_area_text || "All Paris",
                      )}
                    />
                  </label>
                  <label>
                    Affected radius (km)
                    <input
                      type="number"
                      name="affected_radius_km"
                      step="0.1"
                      min="0"
                      max="100"
                      defaultValue={String(initial.affected_radius_km ?? "")}
                    />
                  </label>
                  <label>
                    Expires (local time)
                    <input
                      type="datetime-local"
                      name="expires_at"
                      defaultValue={
                        initial.expires_at
                          ? String(initial.expires_at).slice(0, 16)
                          : ""
                      }
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Deadline (local time)
                    <input
                      name="deadline_at"
                      type="datetime-local"
                      required
                      defaultValue={String(initial.deadline_at || "").slice(
                        0,
                        16,
                      )}
                    />
                  </label>
                  <label className="check-row">
                    <input
                      name="verified"
                      type="checkbox"
                      defaultChecked={!!initial.verified_at}
                    />
                    I verified this deadline against the original source
                  </label>
                </>
              )}
              </>
              )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Save content"}
          </button>
        </form>
      </section>
    </div>
  );
}
