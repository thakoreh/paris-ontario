import React from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultPreferences } from "@/config/community";
import type { usePersonal } from "@/components/provider";
import { MyArea } from "@/components/my-area";
import { CommunitySubmissionForm, SubmissionReviewQueue } from "@/components/community-submission-form";
import { AlertsPage } from "@/components/alerts-page";
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
  it("merges alert preferences and browser controls under one Alerts heading", () => {
    const html = renderToString(React.createElement(AlertsPage));
    expect(html.match(/<h1>/g)).toHaveLength(1);
    expect(html).toContain("<h1>Alerts</h1>");
    expect(html).toContain('id="alert-preferences-heading"');
    expect(html).toContain('id="browser-notifications"');
    expect(html).toContain("<h2>Browser notifications</h2>");
    expect(html).toContain('href="/app/alerts#browser-notifications"');
    expect(html).toContain("Sign in to enable notifications");
  });
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
  it("hides intake until availability is confirmed", () => {
    const html = renderToString(React.createElement(CommunitySubmissionForm));
    expect(html).toContain('href="/contact"');
    expect(html).not.toContain("Review my update");
    expect(html).not.toContain("not available in this environment");
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
