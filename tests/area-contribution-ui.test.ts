import React from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultPreferences } from "@/config/community";
import type { usePersonal } from "@/components/provider";
import { MyArea } from "@/components/my-area";
import { CommunitySubmissionForm, SubmissionReviewQueue } from "@/components/community-submission-form";
import { BrowserNotifications } from "@/components/browser-notifications";
const state = vi.hoisted(() => ({ personal: {} as ReturnType<typeof usePersonal> }));
vi.mock("@/components/provider", () => ({ usePersonal: () => state.personal }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/map-panel", () => ({ MapPanel: () => React.createElement("div", { "data-map": true }) }));
beforeEach(() => {
  state.personal = {
    profile: null, locations: [], preferences: { ...defaultPreferences },
    saved: [], read: [], dismissed: [], reminders: [], ready: true, demo: true,
    guest: true, message: "", areaScope: "nearby", lastVisitAt: null, visitHistoryAvailable: true,
    notify: vi.fn(), enterDemo: vi.fn(), saveLocation: vi.fn(), removeLocation: vi.fn(),
    savePreferences: vi.fn(), toggleNotice: vi.fn(), remind: vi.fn(), signOut: vi.fn(), setAreaScope: vi.fn(),
  };
});
describe("progressive area setup and private contribution UI", () => {
  it("starts with private area choice before interests or browser permission", () => {
    const html = renderToString(React.createElement(MyArea, { notices: [] }));
    expect(html).toContain("Make Paris feel local.");
    expect(html).toContain("Save radius &amp; preview");
    expect(html).toContain("They are not transferred when you sign in.");
    expect(html).toContain("You do not need to save your exact home address.");
    expect(html).not.toContain("Enable on this browser");
    expect(html).not.toContain("No matching updates right now");
  });
  it("supports embedding the existing explicit-opt-in device flow without a second h1", () => {
    const html = renderToString(React.createElement(BrowserNotifications, { embedded: true }));
    expect(html).not.toContain("<h1>");
    expect(html).toContain("<h2>Browser notifications</h2>");
    expect(html).toContain("No prompts until you choose Enable.");
    expect(html).toContain("publishing one does not automatically send an alert");
  });
  it("does not ask anonymous contributors for identity or precise locations", () => {
    const html = renderToString(React.createElement(CommunitySubmissionForm));
    expect(html).toContain("Original source URL");
    expect(html).toContain("Review my update");
    expect(html).toContain("public details only");
    expect(html).toContain("No account or contact information is needed.");
    expect(html).not.toContain('type="email"');
    expect(html).not.toContain("Send for editor review");
    expect(html).not.toContain('value="emergency"');
  });
  it("never grants editor review access to a guest", () => {
    const html = renderToString(React.createElement(SubmissionReviewQueue));
    expect(html).toContain("Editor access required");
    expect(html).not.toContain("Review status");
  });
  it("never grants editor review access to an ordinary account", () => {
    state.personal.profile = { id: "user", email: "user@example.test", full_name: "Resident", role: "user" };
    const html = renderToString(React.createElement(SubmissionReviewQueue));
    expect(html).toContain("Editor access required");
  });
});
