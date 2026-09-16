"use client";

import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { sharePublicLink } from "@/lib/share-link";

export function ShareButton({
  base,
  publicPath,
  title,
}: {
  base: string;
  publicPath: string;
  title: string;
}) {
  const [manualUrl, setManualUrl] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const sharing = useRef(false);

  useEffect(() => {
    if (manualUrl) {
      input.current?.focus();
      input.current?.select();
    }
  }, [manualUrl]);

  async function share() {
    if (sharing.current) return;
    sharing.current = true;
    setBusy(true);
    setManualUrl("");
    setMessage("");

    try {
      const outcome = await sharePublicLink({ base, publicPath, title }, navigator);
      const messages = {
        shared: "Sharing completed.",
        copied: "Link copied.",
        cancelled: "Sharing cancelled.",
        manual: "Copy the link below to share this page.",
      };
      setMessage(messages[outcome.status]);
      if (outcome.status === "manual") setManualUrl(outcome.url);
    } catch {
      setMessage("Sharing is unavailable. Please try again later.");
    } finally {
      sharing.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="share-control">
      <button
        type="button"
        className="button outline"
        disabled={busy}
        aria-busy={busy}
        onClick={() => void share()}
      >
        <Share2 size={16} aria-hidden="true" />
        Share
      </button>
      <span role="status" aria-live="polite" className="share-status">
        {message}
      </span>
      {manualUrl && (
        <label className="share-manual-link">
          <span>Link to share</span>
          <input
            ref={input}
            type="text"
            readOnly
            value={manualUrl}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      )}
    </div>
  );
}
