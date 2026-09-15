"use client";
import { useState } from "react";
export function SendPushButton({ noticeId }: { noticeId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function send() {
    if (
      !window.confirm(
        "Send this verified notice to opted-in browsers? Already-sent subscriptions will be skipped. Sends up to 20 subscriptions per batch.",
      )
    )
      return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noticeId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Send failed.");
      setMessage(
        `${result.sent} accepted by push service; ${result.failed} failed; ${result.remaining} remaining or pending. ${result.recordingFailures ? "Delivery recording needs review." : ""}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Send failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button className="button outline small" disabled={busy} onClick={send}>
        {busy ? "Sending…" : "Send browser alert"}
      </button>
      {message && <small role="status">{message}</small>}
    </div>
  );
}
