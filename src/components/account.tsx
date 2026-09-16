"use client";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  MapPin,
  ShieldCheck,
  Trash2,
  Plus,
  Check,
  Mail,
} from "lucide-react";
import { browserClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-feedback";
import { usePersonal } from "./provider";
import { community } from "@/config/community";
import {
  categories,
  categoryLabels,
  type Location,
  type Preferences,
} from "@/types";
import { MapPanel } from "./map-panel";
import { AddressAutocomplete, type AddressSuggestion } from "./address-autocomplete";
import { Button } from "./ui/button";
import { locationSchema } from "@/lib/validation";
const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Use at least 8 characters."),
  name: z.string().optional(),
});
export function AuthForm({ mode }: { mode: string }) {
  const p = usePersonal();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "confirmation")
      setMessage(
        "That confirmation link is invalid or expired. Request a new confirmation email and try again.",
      );
  }, []);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      password: mode === "forgot-password" ? "unused-password" : "",
    },
  });
  async function submit(data: z.infer<typeof authSchema>) {
    const db = browserClient();
    if (!db) {
      setMessage(
        "Live accounts need Supabase. You can explore the local demo below.",
      );
      return;
    }
    setBusy(true);
    try {
      const result =
        mode === "signup"
          ? await db.auth.signUp({
              email: data.email,
              password: data.password,
              options: {
                data: { full_name: data.name || "Resident" },
                emailRedirectTo: `${window.location.origin}/auth/callback`,
              },
            })
          : mode === "forgot-password"
            ? await db.auth.resetPasswordForEmail(data.email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
              })
            : mode === "reset-password"
              ? await db.auth.updateUser({ password: data.password })
              : await db.auth.signInWithPassword({
                  email: data.email,
                  password: data.password,
                });
      if (result.error) throw result.error;
      if (mode === "login") window.location.assign("/app");
      else if (mode === "reset-password") window.location.assign("/app");
      else
        setMessage(
          mode === "signup"
            ? "Check your email to confirm your account."
            : "If that account exists, a reset link is on its way.",
        );
    } catch (e) {
      setMessage(authErrorMessage(mode, e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-wrap">
      <div className="auth-story">
        <span className="eyebrow">YOUR NEIGHBOURHOOD. IN FOCUS.</span>
        <h1>
          A little more
          <br />
          in the know.
        </h1>
        <p>Keep up with the changes around the places you care about.</p>
        <div>
          <ShieldCheck /> Your saved addresses are private.
          <br />
          We never sell precise location data.
        </div>
      </div>
      <div className="form-card">
        <h2>
          {mode === "signup"
            ? "Find your local Pulse"
            : mode === "forgot-password"
              ? "Reset your password"
              : mode === "reset-password"
                ? "Choose a new password"
                : "Welcome back"}
        </h2>
        <p>
          {mode === "signup"
            ? "A quieter, more useful way to stay informed."
            : "Your community is right here."}
        </p>
        <Link href="/app" className="button outline">
          Continue without signing in <ArrowRight size={16} />
        </Link>
        <form onSubmit={handleSubmit(submit)}>
          {mode === "signup" && (
            <label>
              Your name
              <input autoComplete="name" {...register("name")} />
            </label>
          )}
          <label>
            Email address
            <input type="email" autoComplete="email" {...register("email")} />
            {errors.email && (
              <small className="error">{errors.email.message}</small>
            )}
          </label>
          {mode !== "forgot-password" && (
            <label>
              Password
              <input
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                {...register("password")}
              />
              {errors.password && (
                <small className="error">{errors.password.message}</small>
              )}
            </label>
          )}
          <Button type="submit" disabled={busy}>
            {busy
              ? "Working…"
              : mode === "signup"
                ? "Create my account"
                : mode === "forgot-password"
                  ? "Send reset link"
                  : mode === "reset-password"
                    ? "Update password"
                    : "Sign in"}
            <ArrowRight size={16} />
          </Button>
        </form>
        {message && (
          <p role="status" className="message-box">
            {message}
          </p>
        )}
        <div className="auth-links">
          <Link href={mode === "signup" ? "/login" : "/signup"}>
            {mode === "signup"
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </Link>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        {p.demo && (
          <div className="demo-entry">
            <strong>Try Paris Pulse without an account</strong>
            <p>
              Sample data and preferences stay in this browser. No real
              authentication or email delivery.
            </p>
            <button
              className="button outline"
              onClick={() => {
                p.enterDemo();
                window.location.assign("/onboarding");
              }}
            >
              Explore the demo <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export function AccountGate({ children }: { children: React.ReactNode }) {
  const p = usePersonal();
  if (!p.ready) return <div className="page-wrap">Loading your Pulse…</div>;
  return children;
}
export function LocationForm({ onDone }: { onDone?: () => void }) {
  const p = usePersonal();
  const router = useRouter();
  const [label, setLabel] = useState("Home");
  const [address, setAddress] = useState("");
  const [postal, setPostal] = useState("");
  const [type, setType] = useState<Location["location_type"]>("home");
  const [point, setPoint] = useState({
    latitude: community.latitude,
    longitude: community.longitude,
  });
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const pick = useCallback((latitude: number, longitude: number) => {
    setPoint({ latitude, longitude });
    setConfirmed(true);
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmed) {
      setMessage(
        "Select your location on the map, or confirm the coordinates below.",
      );
      return;
    }
    setBusy(true);
    try {
      const data = locationSchema.parse({
        label,
        address_line: address,
        postal_code: postal,
        ...point,
        location_type: type,
        is_primary: p.locations.length === 0,
      });
      await p.saveLocation({
        ...data,
        id: crypto.randomUUID(),
        user_id: p.profile?.id || "guest",
        community_id: community.id,
        city: community.name,
        province: community.province,
      });
      if (onDone) onDone();
      else router.push("/app/locations");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save location.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="location-form" onSubmit={save}>
      <div className="two-grid">
        <label>
          Place label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            maxLength={50}
          />
        </label>
        <label>
          Place type
          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as Location["location_type"])
            }
          >
            <option value="home">Home</option>
            <option value="work">Work</option>
            <option value="school">School</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>
      <AddressAutocomplete
        value={address}
        onChange={(value) => {
          setAddress(value);
          setConfirmed(false);
        }}
        onSelect={(suggestion: AddressSuggestion) => {
          setAddress(suggestion.address);
          setPostal(suggestion.postalCode);
          setPoint({
            latitude: suggestion.latitude,
            longitude: suggestion.longitude,
          });
          setConfirmed(false);
          setMessage("");
        }}
      />
      <label>
        Postal code (optional)
        <input
          value={postal}
          onChange={(e) => setPostal(e.target.value)}
          placeholder="N3L"
          maxLength={10}
        />
      </label>
      <p className="message-box">
        Choose a suggestion to preview its real map point. You can also type an
        address manually and place the pin by tapping the map or editing the
        coordinates.
      </p>
      <div className="location-map">
        <MapPanel notices={[]} pick={point} onPick={pick} />
      </div>
      <div className="two-grid">
        <label>
          Latitude
          <input
            type="number"
            step="any"
            min="-90"
            max="90"
            value={point.latitude}
            onChange={(e) => {
              setPoint({ ...point, latitude: Number(e.target.value) });
              setConfirmed(true);
            }}
          />
        </label>
        <label>
          Longitude
          <input
            type="number"
            step="any"
            min="-180"
            max="180"
            value={point.longitude}
            onChange={(e) => {
              setPoint({ ...point, longitude: Number(e.target.value) });
              setConfirmed(true);
            }}
          />
        </label>
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        I’ve checked this map location.
      </label>
      {message && (
        <p role="alert" className="error">
          {message}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save location"}
        <ArrowRight size={16} />
      </Button>
    </form>
  );
}
export function LocationsPage() {
  const p = usePersonal();
  return (
    <div className="page-wrap">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR PULSE</span>
          <h1>Your places, privately saved.</h1>
          <p>
            We use these places to find relevant changes. Only you can see them.
          </p>
        </div>
        <Link className="button primary" href="/app/locations/new">
          <Plus size={16} />
          Add a place
        </Link>
      </div>
      <div className="two-grid">
        {p.locations.map((l) => (
          <article className="panel location-card" key={l.id}>
            <MapPin />
            <h2>{l.label}</h2>
            <p>{l.address_line}</p>
            <small>
              {l.latitude.toFixed(4)}, {l.longitude.toFixed(4)}
            </small>
            <button
              className="button outline small"
              onClick={() =>
                void p.removeLocation(l.id).catch((e) => p.notify(e.message))
              }
            >
              <Trash2 size={14} />
              Remove
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
export function PreferencesForm({
  onDone,
  step,
}: {
  onDone?: () => void;
  step?: number;
}) {
  const p = usePersonal();
  const [v, setV] = useState<Preferences>(p.preferences);
  const [busy, setBusy] = useState(false);
  const show = (n: number) => step === undefined || step === n;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await p.savePreferences(v);
          onDone?.();
        } catch (e) {
          p.notify(e instanceof Error ? e.message : "Could not save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {show(1) && (
        <section className="preference-section">
          <h2>What matters to you?</h2>
          <p>Your interests help us prioritize your feed.</p>
          <div className="interest-grid">
            {categories.map((c) => (
              <label
                key={c}
                className={
                  v.categories_json.includes(c)
                    ? "interest selected"
                    : "interest"
                }
              >
                <input
                  type="checkbox"
                  checked={v.categories_json.includes(c)}
                  onChange={(e) =>
                    setV({
                      ...v,
                      categories_json: e.target.checked
                        ? [...v.categories_json, c]
                        : v.categories_json.filter((x) => x !== c),
                    })
                  }
                />
                {categoryLabels[c]}
                {v.categories_json.includes(c) && <Check size={15} />}
              </label>
            ))}
          </div>
        </section>
      )}
      {show(2) && (
        <section className="preference-section">
          <h2>How close to home?</h2>
          <p>3 km is a useful starting point. You can change it anytime.</p>
          <div className="radius-options">
            {[0.5, 1, 3, 5, 0].map((r) => (
              <button
                type="button"
                key={r}
                className={v.radius_km === r ? "selected" : ""}
                onClick={() => setV({ ...v, radius_km: r })}
              >
                {r === 0 ? "All Paris" : r === 0.5 ? "500 m" : `${r} km`}
              </button>
            ))}
          </div>
          <label>
            Minimum importance
            <select
              value={v.minimum_severity}
              onChange={(e) =>
                setV({
                  ...v,
                  minimum_severity: e.target
                    .value as Preferences["minimum_severity"],
                })
              }
            >
              <option value="info">All updates</option>
              <option value="useful">Useful and above</option>
              <option value="important">Important and urgent</option>
              <option value="urgent">Urgent only</option>
            </select>
          </label>
        </section>
      )}
      {show(3) && (
        <section className="preference-section">
          <h2>Updates on your terms.</h2>
          <p>
            Daily email is the default. Your preferences are saved; scheduled
            delivery is not enabled in this MVP.
          </p>
          {(
            [
              [
                "daily_digest_enabled",
                "Daily digest",
                "One useful summary of what changed.",
              ],
              [
                "weekly_digest_enabled",
                "Weekly digest",
                "A wider look at your week.",
              ],
              [
                "instant_enabled",
                "Important instant alerts",
                "Only significant official disruptions. Events stay in digests.",
              ],
              [
                "deadline_reminders_enabled",
                "Deadline reminders",
                "Give yourself a little heads-up.",
              ],
              [
                "email_enabled",
                "Email updates",
                "Requires an account for future email delivery. Browsing and personalization stay available without one.",
              ],
            ] as const
          ).map(([key, title, description]) => (
            <label className="toggle-row" key={key}>
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={v[key]}
                onChange={(e) => setV({ ...v, [key]: e.target.checked })}
              />
            </label>
          ))}
          <label className="toggle-row">
            <span>
              <strong>Push notifications</strong>
              <small>Coming later. Browser push is not enabled.</small>
            </span>
            <input type="checkbox" disabled checked={false} readOnly />
          </label>
          <div className="two-grid">
            <label>
              Quiet hours start
              <input
                type="time"
                value={v.quiet_hours_start || ""}
                onChange={(e) =>
                  setV({ ...v, quiet_hours_start: e.target.value || null })
                }
              />
            </label>
            <label>
              Quiet hours end
              <input
                type="time"
                value={v.quiet_hours_end || ""}
                onChange={(e) =>
                  setV({ ...v, quiet_hours_end: e.target.value || null })
                }
              />
            </label>
          </div>
        </section>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : onDone ? "Continue" : "Save preferences"}
        <ArrowRight size={16} />
      </Button>
    </form>
  );
}
export function Onboarding() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  return (
    <AccountGate>
      <div className="page-wrap onboarding">
        <span className="eyebrow">MAKE IT LOCAL · STEP {step + 1} OF 4</span>
        <div className="step-track">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i <= step ? "done" : ""} />
          ))}
        </div>
        <div className="panel">
          {step === 0 ? (
            <>
              <h1>Where should we monitor?</h1>
              <p>Start with Home. You can add more places later.</p>
              <LocationForm onDone={() => setStep(1)} />
            </>
          ) : (
            <PreferencesForm
              key={step}
              step={step}
              onDone={() =>
                step === 3 ? router.push("/app") : setStep(step + 1)
              }
            />
          )}
        </div>
      </div>
    </AccountGate>
  );
}
export function SettingsPage() {
  const p = usePersonal();
  return (
    <div className="page-wrap narrow">
      <h1>Your settings</h1>
      <div className="panel">
        <Mail />
        <h2>{p.guest ? "Your browser profile" : p.profile?.full_name}</h2>
        <p>{p.profile?.email}</p>
        {p.guest && (
          <p>
            No account needed. Your places, saved notices and preferences stay
            in this browser. They are not automatically transferred when you
            sign in.
          </p>
        )}
        {p.guest && (
          <Link href="/login" className="text-link">
            Sign in (optional)
          </Link>
        )}
        <div className="action-row">
          <Link href="/app/locations" className="button outline">
            Manage locations
          </Link>
          <button className="button outline" onClick={() => void p.signOut()}>
            {p.guest ? "Clear browser data" : "Sign out"}
          </button>
        </div>
      </div>
      <div className="panel">
        <PreferencesForm />
      </div>
      <p>
        <ShieldCheck size={16} /> Your private locations are only used for local
        matching. <Link href="/disclaimer">Privacy details</Link>
      </p>
    </div>
  );
}
