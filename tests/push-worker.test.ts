import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import vm from "node:vm";

describe("push service worker", () => {
  it("displays notifications and never opens an off-site notification URL", async () => {
    const events: Record<string, (event: unknown) => void> = {};
    const displayed: unknown[] = [];
    const opened: string[] = [];
    const context = {
      URL,
      self: {
        location: { origin: "https://parispulse.ca" },
        registration: {
          showNotification: async (...args: unknown[]) => {
            displayed.push(args);
          },
        },
        addEventListener: (name: string, handler: (event: unknown) => void) => {
          events[name] = handler;
        },
        clients: {
          openWindow: async (url: string) => {
            opened.push(url);
          },
        },
      },
    };
    vm.runInNewContext(readFileSync("public/push-sw.js", "utf8"), context);
    let pending: Promise<unknown> = Promise.resolve();
    events.push({
      data: {
        json: () => ({
          title: "Paris Pulse",
          body: "Test",
          url: "https://evil.example",
        }),
      },
      waitUntil: (p: Promise<unknown>) => {
        pending = p;
      },
    });
    await pending;
    expect(displayed).toHaveLength(1);
    events.notificationclick({
      notification: { close() {}, data: { url: "https://evil.example" } },
      waitUntil: (p: Promise<unknown>) => {
        pending = p;
      },
    });
    await pending;
    expect(opened).toEqual(["https://parispulse.ca/today"]);
  });
});
