"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { community } from "@/config/community";
import { categories } from "@/types";
import { usePersonal } from "./provider";

export function BrowserNotifications({ embedded = false }: { embedded?: boolean }) {
  const personal = usePersonal();
  const [supported, setSupported] = useState(false);
  const [checkingBrowser, setCheckingBrowser] = useState(true);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmedAccount, setConfirmedAccount] = useState<string | null>(null);
  const hasPlace = personal.locations.some(
    (location) =>
      location.community_id === community.id &&
      Number.isFinite(location.latitude) &&
      Number.isFinite(location.longitude) &&
      Math.abs(location.latitude) <= 90 &&
      Math.abs(location.longitude) <= 180,
  );
  const hasInterests = personal.preferences.categories_json.some((category) =>
    categories.includes(category),
  );
  const hasRadius =
    Number.isFinite(personal.preferences.radius_km) &&
    personal.preferences.radius_km >= 0;
  const canEnable =
    personal.ready &&
    !!personal.profile &&
    hasPlace &&
    hasInterests &&
    hasRadius;
  const masterEnabled = personal.preferences.push_enabled === true;
  const confirmed = !!subscription && confirmedAccount === personal.profile?.id;

  useEffect(() => {
    const canPush =
      window.isSecureContext &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(canPush);
    if (!canPush) {
      setCheckingBrowser(false);
      return;
    }
    let active = true;
    navigator.serviceWorker
      .getRegistration("/")
      .then(async (registration) => {
        const existing = await registration?.pushManager.getSubscription();
        if (active) setSubscription(existing || null);
      })
      .catch(() => {
        if (active)
          setMessage("Unable to read this browser's notification settings.");
      })
      .finally(() => {
        if (active) setCheckingBrowser(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function request(path: string, method: string, body?: unknown) {
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        `${result.error || "Unable to update notifications. Please retry."}${typeof result.sent === "number" && result.sent > 0 ? ` ${result.sent} test notifications were accepted before the request stopped.` : ""}`,
      );
    return result;
  }
  async function enable() {
    if (busy || !supported || !canEnable || checkingBrowser) return;
    setBusy(true);
    setMessage("");
    let created: PushSubscription | null = null;
    let savedPreference = false;
    try {
      // Permission and account opt-in happen only after a deliberate Enable click.
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw new Error(
          "Notifications were not allowed. You can change this in your browser's site settings.",
        );
      const config = await request("/api/push", "GET");
      if (!config.ready || !config.publicKey)
        throw new Error(
          "Browser notifications are not configured on the server yet.",
        );
      await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
      const registration = await navigator.serviceWorker.ready;
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        const key = config.publicKey.replace(/-/g, "+").replace(/_/g, "/");
        const bytes = Uint8Array.from(
          atob(key.padEnd(Math.ceil(key.length / 4) * 4, "=")),
          (c) => c.charCodeAt(0),
        );
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: bytes,
        });
        created = sub;
      }
      await personal.savePreferences({
        ...personal.preferences,
        push_enabled: true,
      });
      savedPreference = true;
      await request("/api/push", "POST", sub.toJSON());
      setSubscription(sub);
      setConfirmedAccount(personal.profile!.id);
      setMessage(
        "This browser is linked to your account and Push notifications are on. Matching editor-selected notices can be sent outside your quiet hours.",
      );
    } catch (error) {
      if (created) await created.unsubscribe().catch(() => false);
      setConfirmedAccount(null);
      const detail =
        error instanceof Error
          ? error.message
          : "Unable to enable notifications.";
      setMessage(
        savedPreference
          ? `Your Push preference is on, but this browser could not be confirmed. ${detail}`
          : detail,
      );
    } finally {
      setBusy(false);
    }
  }
  async function disable() {
    if (busy || !subscription) return;
    setBusy(true);
    setMessage("");
    let serverRemoved = false;
    try {
      if (personal.profile) {
        try {
          const result = await request("/api/push", "DELETE", {
            endpoint: subscription.endpoint,
          });
          serverRemoved = result.removed > 0;
        } catch {
          // Local unsubscribe must remain available even if account cleanup fails.
        }
      }
      const removed = await subscription.unsubscribe();
      if (!removed)
        throw new Error(
          serverRemoved
            ? "Server delivery is disabled. Remove notification permission in browser settings to finish browser cleanup."
            : "Unable to remove this browser subscription. Revoke notification permission in your browser's site settings to stop delivery.",
        );
      setSubscription(null);
      setConfirmedAccount(null);
      setMessage(
        serverRemoved
          ? "Notifications disabled on this browser. Your account preference and other devices are unchanged."
          : "Notifications disabled on this browser. Server record cleanup could not be confirmed; its expired subscription may remain on your account until a later send removes it.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to disable notifications. Revoke permission in browser settings to stop delivery.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    if (busy || !canEnable || !masterEnabled || !confirmed) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await request("/api/push/test", "POST");
      setMessage(
        result.sent > 0
          ? "Test accepted by the push service. Look for a notification on your subscribed device; delivery can be delayed by browser or OS settings."
          : "No test was accepted. Check your saved preferences and re-enable this browser before trying again.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Test delivery failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={embedded ? "embedded-notifications" : "page-wrap narrow"}>
      <span className="eyebrow">YOUR BROWSER, YOUR CHOICE</span>
      {embedded ? <h2>Browser notifications</h2> : <h1>Browser notifications</h1>}
      <p className="page-intro">
        Opt in to editor-selected, verified local notices that match your saved
        places, radius, interests and minimum importance. Editors choose when to
        send a notice; publishing one does not automatically send an alert.
      </p>
      <div className="message-box">
        Paris Pulse is not an emergency warning service. Notification delivery
        is not guaranteed. Follow official authorities for urgent warnings.
      </div>
      <section className="panel">
        <h2>Notify me on this device</h2>
        <p>
          No prompts until you choose Enable. This also turns on your account’s
          Push notifications preference, including delivery to its other
          subscribed devices. Each browser needs its own opt-in. You can disable
          this browser here or turn off delivery to all devices in Settings.
        </p>
        {!personal.ready ? (
          <p>Checking account…</p>
        ) : (
          <>
            {!personal.profile && (
              <>
                <p>
                  Notifications need an account with at least one saved place
                  and selected interests. Guest places and preferences stay in
                  this browser and are not transferred when you sign in.
                </p>
                <Link className="button primary" href="/login">
                  Sign in to enable notifications
                </Link>
              </>
            )}
            {!hasPlace && (
              <p>
                Add a saved place to your account before enabling notifications.
                {personal.profile && (
                  <>
                    {" "}
                    <Link className="text-link" href="/app/locations/new">
                      Add a saved place
                    </Link>
                  </>
                )}
              </p>
            )}
            {(!hasInterests || !hasRadius) && (
              <p>
                Choose at least one interest and a radius, or explicitly choose
                All Paris.{" "}
                <Link className="text-link" href="/app/alerts">
                  Choose alert preferences
                </Link>
              </p>
            )}
            {personal.profile && (
              <p role="status">
                {!masterEnabled
                  ? "Push delivery is off in your account preferences. Enable on this browser to turn it on."
                  : !canEnable
                    ? "Push delivery is paused until your saved place, interests and radius are ready."
                    : confirmed
                      ? "This browser is linked to your account. Delivery uses your saved preferences and quiet hours."
                      : subscription
                        ? "This browser has a subscription. Refresh it to confirm it is linked to this account."
                        : "Push is on for your account. Enable this browser to subscribe this device."}
              </p>
            )}
            {checkingBrowser ? (
              <p>Checking this browser…</p>
            ) : !supported ? (
              <p>
                This browser does not support push here. On iPhone or iPad, add
                Paris Pulse to your Home Screen, then open it from there in a
                supported iOS version.
              </p>
            ) : null}
            <div className="action-row">
              {personal.profile && supported && (
                <button
                  className="button primary"
                  disabled={busy || !canEnable || checkingBrowser}
                  onClick={enable}
                >
                  {subscription && masterEnabled
                    ? "Refresh subscription"
                    : "Enable on this browser"}
                </button>
              )}
              {subscription && (
                <>
                  <button
                    className="button outline"
                    disabled={busy}
                    onClick={disable}
                  >
                    Disable on this browser
                  </button>
                  <button
                    className="button outline"
                    disabled={
                      busy || !canEnable || !masterEnabled || !confirmed
                    }
                    onClick={test}
                  >
                    Send test notification
                  </button>
                </>
              )}
            </div>
          </>
        )}
        {message && (
          <p className="message-box" role="status">
            {message}
          </p>
        )}
      </section>
      <section className="panel">
        <h2>Your matching and delivery settings</h2>
        <p>
          Notices without a verified map position are eligible only when you
          explicitly choose All Paris. Your interests and minimum importance
          still apply. Quiet hours use Paris, Ontario time (America/Toronto).
          Sends during quiet hours are skipped, not queued for later.
        </p>
        <Link className="text-link" href="/app/alerts">
          Manage alert preferences
        </Link>
      </section>
      <section className="panel">
        <h2>Not seeing a notification?</h2>
        <p>
          Check your account’s Push setting, saved places, interests and quiet
          hours, then browser site permissions, operating-system notification
          settings and Focus or Do Not Disturb modes. Enable separately on each
          browser or device. Email alerts, scheduled reminders and automatic
          emergency monitoring are not included.
        </p>
        <Link className="text-link" href="/privacy">
          Read the privacy policy
        </Link>
      </section>
    </div>
  );
}
