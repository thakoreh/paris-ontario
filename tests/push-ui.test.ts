import React from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultPreferences, community } from "@/config/community";
import { BrowserNotifications } from "@/components/browser-notifications";
import { PreferencesForm } from "@/components/account";
import type { usePersonal } from "@/components/provider";

const state = vi.hoisted(() => ({
  personal: {} as ReturnType<typeof usePersonal>,
}));
vi.mock("@/components/provider", () => ({ usePersonal: () => state.personal }));

beforeEach(() => {
  state.personal = {
    profile: {
      id: "resident-test",
      email: "resident@example.test",
      full_name: "Test resident",
      role: "user",
    },
    locations: [],
    preferences: { ...defaultPreferences },
    saved: [],
    read: [],
    dismissed: [],
    reminders: [],
    ready: true,
    demo: false,
    guest: false,
    message: "",
    notify: vi.fn(),
    enterDemo: vi.fn(),
    saveLocation: vi.fn(),
    removeLocation: vi.fn(),
    savePreferences: vi.fn(),
    toggleNotice: vi.fn(),
    remind: vi.fn(),
    signOut: vi.fn(),
  };
});

function addPlace() {
  state.personal.locations = [
    {
      id: "test-place",
      user_id: "resident-test",
      community_id: community.id,
      latitude: community.latitude,
      longitude: community.longitude,
      label: "Test place",
      address_line: "",
      postal_code: "",
      city: "Paris",
      province: "Ontario",
      location_type: "home",
      is_primary: true,
    },
  ];
}

describe("personalized push setup UI", () => {
  it("requires a saved place even for a signed-in resident with Push on", () => {
    state.personal.preferences.push_enabled = true;
    const html = renderToString(React.createElement(BrowserNotifications));
    expect(html).toContain(
      "Add a saved place to your account before enabling notifications.",
    );
    expect(html).toContain('href="/app/locations/new"');
    expect(html).toContain(
      "Push delivery is paused until your saved place, interests and radius are ready.",
    );
    expect(html).not.toContain("This browser is linked to your account.");
  });

  it("explains empty interests and never labels master-off delivery active", () => {
    addPlace();
    state.personal.preferences.categories_json = [];
    const html = renderToString(React.createElement(BrowserNotifications));
    expect(html).toContain("Choose at least one interest and a radius");
    expect(html).toContain("Push delivery is off in your account preferences.");
    expect(html).not.toContain("This browser is linked to your account.");
  });

  it("does not treat another community or invalid saved point as ready", () => {
    addPlace();
    state.personal.locations[0].community_id = "another-community";
    expect(renderToString(React.createElement(BrowserNotifications))).toContain(
      "Add a saved place to your account",
    );
    state.personal.locations[0].community_id = community.id;
    state.personal.locations[0].latitude = 100;
    expect(renderToString(React.createElement(BrowserNotifications))).toContain(
      "Add a saved place to your account",
    );
  });

  it("requires sign-in even when guest settings have a stale enabled preference", () => {
    state.personal.profile = null;
    state.personal.guest = true;
    state.personal.preferences.push_enabled = true;
    const html = renderToString(React.createElement(BrowserNotifications));
    expect(html).toContain("Sign in to enable notifications");
    expect(html).not.toContain("Push is on for your account.");
    expect(html).not.toContain("Send test notification");
  });

  it("renders the saved master preference as an editable switch for an account", () => {
    state.personal.preferences.push_enabled = true;
    const html = renderToString(React.createElement(PreferencesForm));
    const pushRow = html
      .slice(html.indexOf("<strong>Push notifications</strong>"))
      .split("</label>")[0];
    expect(pushRow).toContain('role="switch"');
    expect(pushRow).toContain('checked=""');
    expect(pushRow).not.toContain('disabled=""');
    expect(html).toContain("This switch never prompts for browser permission.");
    expect(html).toContain(
      "matching start and end times pause delivery all day.",
    );
    expect(html).not.toContain("Browser push is not enabled");
    expect(state.personal.savePreferences).not.toHaveBeenCalled();
  });
});
