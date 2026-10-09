import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  buildCommunityEmailDraft,
  buildCorrectionEmailDraft,
} from "@/lib/community-email";
import { CommunityEmailDraft } from "@/components/community-email-draft";

const support = "editor@example.org";

describe("honest email draft UI", () => {
  it("offers an explicit mailto action and a full copy/select fallback", () => {
    const draft = buildCommunityEmailDraft(
      {
        title: "A public neighbourhood update",
        body: "A public event is planned downtown. Please check the original announcement for current details.",
        sourceUrl: "https://www.parisontario.ca/news/event",
      },
      support,
    );
    const html = renderToString(
      React.createElement(CommunityEmailDraft, {
        draft,
        heading: "Prepare an email instead",
        actionLabel: "Open email draft",
      }),
    );

    expect(html).toContain("Open email draft");
    expect(html).toContain("Opening the draft sends nothing");
    expect(html).toContain("Copy full details");
    expect(html).toContain("Select full details");
    expect(html).toContain("Full details to copy or select");
    expect(html).toContain("Recipient:");
    expect(html).toContain("editor@example.org");
    expect(html).toContain("mailto:");
    expect(html).toContain("A public neighbourhood update");
  });

  it("makes an unconfigured contact visibly unavailable instead of inventing a recipient", () => {
    const html = renderToString(
      React.createElement(CommunityEmailDraft, {
        draft: null,
        heading: "Prepare an email instead",
        actionLabel: "Open email draft",
      }),
    );

    expect(html).toContain("Email-assisted contribution is unavailable");
    expect(html).toContain("No safe support address is available");
    expect(html).not.toContain("mailto:");
    expect(html).not.toContain("Open email draft");
  });

  it("states correction emails are voluntary and keeps the resident's message editable", () => {
    const draft = buildCorrectionEmailDraft(
      {
        noticeTitle: "Road closure",
        noticeUrl: "https://parispulse.ca/notice/road-closure",
        sourceUrl: "https://www.brant.ca/roads/closures",
      },
      support,
    );
    const html = renderToString(
      React.createElement(CommunityEmailDraft, {
        draft,
        heading: "Suggest a correction",
        actionLabel: "Open correction email",
        description:
          "Describe the correction in your own email app. Response and publication are not guaranteed.",
      }),
    );

    expect(html).toContain("Open correction email");
    expect(html).toContain("Describe the correction in your own email app");
    expect(html).toContain("Response and publication are not guaranteed");
    expect(html).toContain("notice/road-closure");
    expect(html).not.toContain("saved locations");
  });
});
