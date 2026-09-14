"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  PersonalState,
  Location,
  Preferences,
  Profile,
  Reminder,
} from "@/types";
import { defaultPreferences } from "@/config/community";
import { demoLocations } from "@/data/seed";
import { track } from "@/lib/analytics";
import { browserClient } from "@/lib/supabase/client";
const empty: PersonalState = {
  profile: null,
  locations: [],
  preferences: defaultPreferences,
  saved: [],
  read: [],
  dismissed: [],
  reminders: [],
};
type Context = PersonalState & {
  demo: boolean;
  guest: boolean;
  ready: boolean;
  message: string;
  notify: (s: string) => void;
  enterDemo: () => void;
  saveLocation: (l: Location) => Promise<void>;
  removeLocation: (id: string) => Promise<void>;
  savePreferences: (p: Preferences) => Promise<void>;
  toggleNotice: (
    id: string,
    kind: "saved" | "read" | "dismissed",
  ) => Promise<void>;
  remind: (r: Reminder) => Promise<void>;
  signOut: () => Promise<void>;
};
const StateContext = createContext<Context | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const demo =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const [state, setState] = useState(empty);
  const [ready, setReady] = useState(false);
  const [message, notify] = useState("");
  const update = useCallback(
    (fn: (s: PersonalState) => PersonalState) =>
      setState((s) => {
        const next = fn(s);
        if (demo || !s.profile) {
          try {
            localStorage.setItem(
              "paris-pulse-guest",
              JSON.stringify({ ...next, profile: null }),
            );
          } catch {
            notify(
              "Browser storage is unavailable. Changes will last until you close this page.",
            );
          }
        }
        return next;
      }),
    [demo],
  );
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        try {
          const saved =
            localStorage.getItem("paris-pulse-guest") ||
            (demo ? localStorage.getItem("paris-pulse-demo") : null);
          if (saved)
            setState({ ...empty, ...JSON.parse(saved), profile: null });
        } catch {
          notify(
            "Browser storage is unavailable. Guest changes will only last for this visit.",
          );
        }
        if (!demo) {
          const db = browserClient()!;
          const {
            data: { user },
          } = await db.auth.getUser();
          if (user) {
            const [p, l, a, m, r] = await Promise.all([
              db.from("users").select("*").eq("id", user.id).single(),
              db.from("locations").select("*").eq("user_id", user.id),
              db
                .from("alert_preferences")
                .select("*")
                .eq("user_id", user.id)
                .is("location_id", null)
                .maybeSingle(),
              db.from("user_notice_matches").select("*").eq("user_id", user.id),
              db.from("deadline_reminders").select("*").eq("user_id", user.id),
            ]);
            const error = [p, l, a, m, r].find((x) => x.error)?.error;
            if (error) throw Error(error.message);
            if (active)
              setState({
                profile: p.data as Profile,
                locations: l.data || [],
                preferences: a.data || defaultPreferences,
                saved: (m.data || [])
                  .filter((x) => x.saved_at)
                  .map((x) => x.notice_id),
                read: (m.data || [])
                  .filter((x) => x.read_at)
                  .map((x) => x.notice_id),
                dismissed: (m.data || [])
                  .filter((x) => x.dismissed_at)
                  .map((x) => x.notice_id),
                reminders: r.data || [],
              });
          }
        }
      } catch (e) {
        notify(
          e instanceof Error ? e.message : "Unable to load your preferences.",
        );
      } finally {
        if (active) setReady(true);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [demo]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => notify(""), 6000);
    return () => clearTimeout(t);
  }, [message]);
  async function persist(
    table: string,
    data: Record<string, unknown>,
    conflict?: string,
  ) {
    const db = browserClient();
    if (!db || !state.profile) return;
    const { error } = await db
      .from(table)
      .upsert(data, conflict ? { onConflict: conflict } : undefined);
    if (error) throw Error(error.message);
  }
  const value: Context = {
    ...state,
    demo,
    guest: demo || !state.profile,
    ready,
    message,
    notify,
    enterDemo: () =>
      update((s) => ({
        ...s,
        profile: null,
        locations: demoLocations(),
      })),
    saveLocation: async (l) => {
      await persist("locations", { ...l, user_id: state.profile?.id });
      update((s) => ({
        ...s,
        locations: [...s.locations.filter((x) => x.id !== l.id), l],
      }));
      track("location_added");
      notify("Location saved. Your feed is updated.");
    },
    removeLocation: async (id) => {
      if (!demo && state.profile) {
        const { error } = await browserClient()!
          .from("locations")
          .delete()
          .eq("id", id);
        if (error) throw Error(error.message);
      }
      update((s) => ({
        ...s,
        locations: s.locations.filter((l) => l.id !== id),
      }));
    },
    savePreferences: async (p) => {
      if (!demo && state.profile) {
        const db = browserClient()!;
        const { data, error: readError } = await db
          .from("alert_preferences")
          .select("id")
          .eq("user_id", state.profile!.id)
          .is("location_id", null)
          .maybeSingle();
        if (readError) throw Error(readError.message);
        await persist("alert_preferences", {
          ...p,
          user_id: state.profile!.id,
          ...(data ? { id: data.id } : {}),
        });
      }
      update((s) => ({ ...s, preferences: p }));
      track("alert_enabled", { email: p.email_enabled });
      notify("Your preferences are saved.");
    },
    toggleNotice: async (id, kind) => {
      const on = !state[kind].includes(id);
      await persist(
        "user_notice_matches",
        {
          user_id: state.profile?.id,
          notice_id: id,
          [kind === "saved"
            ? "saved_at"
            : kind === "read"
              ? "read_at"
              : "dismissed_at"]: on ? new Date().toISOString() : null,
        },
        "user_id,notice_id",
      );
      update((s) => ({
        ...s,
        [kind]: on ? [...s[kind], id] : s[kind].filter((x) => x !== id),
      }));
      if (kind === "saved" && on) track("notice_saved", { notice_id: id });
      notify(on ? `Notice marked ${kind}.` : `Notice removed from ${kind}.`);
    },
    remind: async (r) => {
      await persist(
        "deadline_reminders",
        { ...r, user_id: state.profile?.id },
        "user_id,deadline_id",
      );
      update((s) => ({
        ...s,
        reminders: [
          ...s.reminders.filter((x) => x.deadline_id !== r.deadline_id),
          r,
        ],
      }));
      track("deadline_reminder_added", { deadline_id: r.deadline_id });
      notify("Reminder saved. Email scheduling is not enabled yet.");
    },
    signOut: async () => {
      if (!demo) await browserClient()!.auth.signOut();
      if (demo || !state.profile) {
        localStorage.removeItem("paris-pulse-demo");
        localStorage.removeItem("paris-pulse-guest");
      }
      setState(empty);
      window.location.assign("/");
    },
  };
  return (
    <StateContext.Provider value={value}>
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
          <button aria-label="Dismiss message" onClick={() => notify("")}>
            ×
          </button>
        </div>
      )}
    </StateContext.Provider>
  );
}
export function usePersonal() {
  const state = useContext(StateContext);
  if (!state) throw Error("Provider missing");
  return state;
}
