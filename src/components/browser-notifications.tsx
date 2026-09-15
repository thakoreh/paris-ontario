"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePersonal } from "./provider";

export function BrowserNotifications() {
  const personal = usePersonal();
  const [supported, setSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const canPush =
      window.isSecureContext &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(canPush);
    if (canPush)
      navigator.serviceWorker
        .getRegistration("/")
        .then(async (registration) => {
          const existing = await registration?.pushManager.getSubscription();
          setSubscription(existing || null);
        })
        .catch(() =>
          setMessage("Unable to read this browser's notification settings."),
        );
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
        result.error || "Unable to update notifications. Please retry.",
      );
    return result;
  }
  async function enable() {
    setBusy(true);
    setMessage("");
    let created: PushSubscription | null = null;
    try {
      // Permission is requested only after the resident clicks Enable.
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
      await request("/api/push", "POST", sub.toJSON());
      setSubscription(sub);
      setEnabled(true);
      setMessage("Enabled for this browser. Send a test to check delivery.");
    } catch (error) {
      if (created) await created.unsubscribe().catch(() => false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to enable notifications.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function disable() {
    if (!subscription) return;
    setBusy(true);
    try {
      await request("/api/push", "DELETE", { endpoint: subscription.endpoint });
      const removed = await subscription.unsubscribe();
      if (!removed)
        throw new Error(
          "Server delivery is disabled. Remove notification permission in browser settings to finish browser cleanup.",
        );
      setSubscription(null);
      setEnabled(false);
      setMessage("Notifications disabled on this browser.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to disable notifications.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    try {
      const result = await request("/api/push/test", "POST");
      setMessage(
        result.sent > 0
          ? "Test accepted by the push service. Look for a notification on your subscribed device; delivery can be delayed by browser or OS settings."
          : "No test was accepted. Re-enable this browser and try again.",
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
    <div className="page-wrap narrow">
      <span className="eyebrow">YOUR BROWSER, YOUR CHOICE</span>
      <h1>Browser notifications</h1>
      <p className="page-intro">
        Opt in to editor-selected, verified local updates. These are
        community-wide alerts, not personalized location matches.
      </p>
      <div className="message-box">
        Paris Pulse is not an emergency warning service. Notification delivery
        is not guaranteed. Follow official authorities for urgent warnings.
      </div>
      <section className="panel">
        <h2>Notify me on this device</h2>
        <p>
          No prompts until you choose to enable. Your browser subscription is
          stored with your account so we can deliver notifications. You can
          disable it here or revoke permission in browser settings.
        </p>
        {!personal.ready ? (
          <p>Checking account…</p>
        ) : !personal.profile ? (
          <Link className="button primary" href="/login">
            Sign in to enable notifications
          </Link>
        ) : !supported ? (
          <p>
            This browser does not support push here. On iPhone or iPad, add
            Paris Pulse to your Home Screen, then open it from there in a
            supported iOS version.
          </p>
        ) : (
          <div className="action-row">
            <button className="button primary" disabled={busy} onClick={enable}>
              {enabled ? "Refresh subscription" : "Enable on this browser"}
            </button>
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
                  disabled={busy}
                  onClick={test}
                >
                  Send test notification
                </button>
              </>
            )}
          </div>
        )}
        {message && (
          <p className="message-box" role="status">
            {message}
          </p>
        )}
      </section>
      <section className="panel">
        <h2>Not seeing a notification?</h2>
        <p>
          Check browser site permissions, operating-system notification settings
          and Focus or Do Not Disturb modes. Enable separately on each browser
          or device. Email alerts and automatic emergency monitoring are not
          included.
        </p>
        <Link className="text-link" href="/privacy">
          Read the privacy policy
        </Link>
      </section>
    </div>
  );
}
