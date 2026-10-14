import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareButton } from "@/components/share-button";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = hooks.cursor++;
      if (!(index in hooks.values)) hooks.values[index] = initial;
      return [hooks.values[index], (value: unknown) => { hooks.values[index] = value; }];
    },
    useRef: (current: unknown) => ({ current }),
    useEffect: vi.fn(),
    useId: () => "share-test",
  };
});

afterEach(() => vi.unstubAllGlobals());

describe("share button manual fallback", () => {
  it.each([
    ["https://parispulse.ca", "https://parispulse.ca/services"],
    ["http://localhost:3017", "http://localhost:3017/services?view=all"],
    ["/relative", "http://localhost:3017/services?view=all"],
  ])("offers a read-only link after sharing fails with base %s", async (base, expected) => {
    hooks.values = [];
    hooks.cursor = 0;
    vi.stubGlobal("window", {
      location: { href: "http://localhost:3017/services?utm_source=test&view=all&utm_medium=email#details" },
    });
    vi.stubGlobal("navigator", {
      share: vi.fn().mockRejectedValue(new Error("Sharing denied")),
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Copy denied")) },
    });
    const props = { base, publicPath: "/services", title: "Services" };
    const tree = ShareButton(props);
    const button = tree.props.children[0];
    await button.props.onClick();
    // The click handler deliberately returns void; flush the async API fallbacks.
    await vi.waitFor(() => expect(hooks.values[0]).toBe(expected));
    hooks.cursor = 0;
    const rendered = ShareButton(props);
    const label = rendered.props.children[2];
    const input = label.props.children[1] as React.ReactElement<{ readOnly: boolean; value: string }>;
    expect(input.props.readOnly).toBe(true);
    expect(input.props.value).toBe(expected);
    expect(rendered.props.children[1].props.children).toContain("Copy the link below");
  });
});
