import { existsSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EventsLoading from "@/app/events/loading";
import CouncilLoading from "@/app/services/council/loading";
import CatchAllLoading from "@/app/[...path]/loading";

describe("route loading feedback", () => {
  it.each([
    ["events", EventsLoading],
    ["council", CouncilLoading],
    ["catch-all", CatchAllLoading],
  ])("%s shows a polite status while server data loads", (_name, Loading) => {
    const html = renderToStaticMarkup(<Loading />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toMatch(/<h1>.+…<\/h1>/);
  });

  it("keeps home outside a root loading boundary so its first paint is complete", () => {
    expect(existsSync("src/app/loading.tsx")).toBe(false);
  });
});
