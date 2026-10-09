"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Link2, Mail, Share2 } from "lucide-react";
import {
  copyPublicLink,
  shareChannelUrl,
  sharePublicLink,
  type ShareOutcome,
} from "@/lib/share-link";
import "./notice-sharing.css";

const outcomeMessages: Record<ShareOutcome["status"], string> = {
  shared: "Sharing completed.",
  copied: "Link copied.",
  cancelled: "Sharing cancelled.",
  manual: "Copy the link below to share this page.",
};
const unavailableChannelMessage =
  "Sharing links are unavailable until a public HTTPS URL is configured.";

type ShareButtonProps = {
  base: string;
  publicPath: string;
  title: string;
  compact?: boolean;
};

export function ShareButton({
  base,
  publicPath,
  title,
  compact = false,
}: ShareButtonProps) {
  const [manualUrl, setManualUrl] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const firstOption = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const sharing = useRef(false);
  const panelId = `notice-share-${useId().replaceAll(":", "")}`;

  useEffect(() => {
    if (manualUrl) {
      input.current?.focus();
      input.current?.select();
    }
  }, [manualUrl]);

  useEffect(() => {
    if (!compact || !open) return;

    firstOption.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      window.requestAnimationFrame(() => trigger.current?.focus());
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (root.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [compact, open]);

  async function share() {
    if (sharing.current) return;
    sharing.current = true;
    setBusy(true);
    setManualUrl("");
    setMessage("");

    try {
      const outcome = await sharePublicLink({ base, publicPath, title }, navigator);
      setMessage(outcomeMessages[outcome.status]);
      if (outcome.status === "manual") setManualUrl(outcome.url);
    } catch {
      setMessage("Sharing is unavailable. Please try again later.");
    } finally {
      sharing.current = false;
      setBusy(false);
    }
  }

  async function copyLink() {
    if (sharing.current) return;
    sharing.current = true;
    setBusy(true);
    setManualUrl("");
    setMessage("");

    try {
      const outcome = await copyPublicLink(
        { base, publicPath, title },
        navigator,
      );
      setMessage(outcomeMessages[outcome.status]);
      if (outcome.status === "manual") setManualUrl(outcome.url);
    } catch {
      setMessage("Sharing is unavailable. Please try again later.");
    } finally {
      sharing.current = false;
      setBusy(false);
    }
  }

  if (compact) {
    const whatsappUrl = open
      ? shareChannelUrl("whatsapp", { base, publicPath, title })
      : null;
    const emailUrl = open
      ? shareChannelUrl("email", { base, publicPath, title })
      : null;
    const channelsUnavailable = open && (!whatsappUrl || !emailUrl);

    return (
      <div className="share-control notice-share" ref={root}>
        <button
          ref={trigger}
          type="button"
          className="button outline notice-share-trigger"
          disabled={busy}
          aria-busy={busy}
          aria-expanded={open}
          aria-controls={panelId}
          aria-haspopup="dialog"
          aria-label={`Share notice: ${title}`}
          onClick={() => {
            setMessage("");
            setManualUrl("");
            setOpen((wasOpen) => !wasOpen);
          }}
        >
          <Share2 size={15} aria-hidden="true" />
          Share
        </button>
        {open && (
          <div
            id={panelId}
            className="notice-share-panel"
            role="dialog"
            aria-label="Share this notice"
          >
            <p className="notice-share-heading">Share this notice</p>
            <div className="notice-share-options">
              <button
                ref={firstOption}
                type="button"
                className="notice-share-option"
                disabled={busy}
                onClick={() => void copyLink()}
              >
                <Link2 size={14} aria-hidden="true" />
                Copy link
              </button>
              {whatsappUrl ? (
                <a
                  className="notice-share-option"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              ) : (
                <button
                  type="button"
                  className="notice-share-option"
                  disabled
                >
                  WhatsApp unavailable
                </button>
              )}
              {emailUrl ? (
                <a className="notice-share-option" href={emailUrl}>
                  <Mail size={14} aria-hidden="true" />
                  Email
                </a>
              ) : (
                <button
                  type="button"
                  className="notice-share-option"
                  disabled
                >
                  Email unavailable
                </button>
              )}
            </div>
            <span role="status" aria-live="polite" className="share-status">
              {message || (channelsUnavailable ? unavailableChannelMessage : "")}
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
        )}
      </div>
    );
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
