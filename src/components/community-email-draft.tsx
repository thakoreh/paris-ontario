"use client";

import React, { useRef, useState } from "react";
import type { CommunityEmailDraft as Draft } from "@/lib/community-email";
import "./community-email.css";

type CommunityEmailDraftProps = {
  draft: Draft | null;
  heading: string;
  actionLabel: string;
  description?: string;
};

export function CommunityEmailDraft({
  draft,
  heading,
  actionLabel,
  description,
}: CommunityEmailDraftProps) {
  const [status, setStatus] = useState("");
  const detailsRef = useRef<HTMLTextAreaElement>(null);

  if (!draft) {
    return (
      <section className="community-email-draft" aria-label={heading}>
        <h2>{heading}</h2>
        <p>
          <strong>Email-assisted contribution is unavailable.</strong> No safe
          support address is available, so nothing can be prepared here.
        </p>
      </section>
    );
  }

  const currentDraft = draft;

  async function copyDetails() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(currentDraft.fullText);
      setStatus("Full details copied. Review them before sending.");
    } catch {
      selectDetails();
      setStatus("Copy was unavailable. The full details are selected below for manual copying.");
    }
  }

  function selectDetails() {
    const textarea = detailsRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.select();
  }

  return (
    <section className="community-email-draft" aria-label={heading}>
      <h2>{heading}</h2>
      <p>
        {description ||
          "Opening the draft sends nothing. Review it in your email app before you choose whether to send. Your sender address and email provider are involved; response or publication is not guaranteed."}
      </p>
      <p className="community-email-recipient">
        Recipient: <code>{currentDraft.recipient}</code>
      </p>
      {currentDraft.wasTruncated && (
        <p className="community-email-note">
          To keep the email link safely bounded, the opening draft is shortened.
          The complete details remain available below to copy or select; no
          submitted text is silently discarded.
        </p>
      )}
      <div className="community-email-actions">
        <a className="button primary" href={currentDraft.mailto}>
          {actionLabel}
        </a>
        <button className="button outline" type="button" onClick={() => void copyDetails()}>
          Copy full details
        </button>
        <button className="button outline" type="button" onClick={selectDetails}>
          Select full details
        </button>
      </div>
      <label className="community-email-details">
        Full details to copy or select
        <textarea
          ref={detailsRef}
          aria-label="Full details to copy or select"
          readOnly
          rows={10}
          value={currentDraft.fullText}
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
      {status && (
        <p className="community-email-status" role="status">
          {status}
        </p>
      )}
    </section>
  );
}
