import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProfileHub } from "@/components/profile-hub";
import { Shell } from "@/components/shell";

const state = vi.hoisted(() => ({
  profile: null as null | { id: string },
  ready: true,
  path: "/",
}));
vi.mock("@/components/provider", () => ({
  usePersonal: () => ({
    ...state,
    locations: [],
    preferences: {},
    demo: false,
  }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => state.path }));
vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement("a", props, children),
}));

describe("profile navigation", () => {
  it("lists every account tool for signed-in residents", () => {
    state.profile = { id: "resident" };
    const html = renderToStaticMarkup(React.createElement(ProfileHub));
    for (const href of [
      "/app/area",
      "/app/saved",
      "/app/locations",
      "/app/alerts",
      "/app/settings",
      "/share-update",
    ])
      expect(html).toContain(`href="${href}"`);
    expect(html).not.toContain('href="/login"');
  });
  it("prompts guests to sign in and preserves the Share link", () => {
    state.profile = null;
    const html = renderToStaticMarkup(React.createElement(ProfileHub));
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/share-update"');
    expect(html).not.toContain('href="/app/settings"');
  });
  it.each([
    "/events",
    "/explore",
    "/explore/trails",
    "/services/council",
    "/profile",
  ])("marks only the correct destination on %s", (path) => {
    state.path = path;
    const html = renderToStaticMarkup(
      React.createElement(Shell, null, "Content"),
    );
    expect(html.match(/aria-current="page"/g)?.length || 0).toBe(
      path === "/profile" ? 0 : 2,
    );
    expect(html).not.toContain("all-pages-menu");
    expect(html).not.toContain('href="/today"');
    expect(html).toContain('href="/profile"');
  });
});
