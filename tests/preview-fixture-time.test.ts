import { afterEach, describe, expect, it, vi } from "vitest";
import { previewForTests } from "@/data/verified-preview";
import { isPublicDeadline, isPublicNotice } from "@/lib/public-content";

const future = new Date("2031-11-01T16:00:00Z");
afterEach(() => vi.unstubAllEnvs());
describe("relative browser fixtures", () => {
  it("keeps notices and deadlines available after recorded source dates expire", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PARIS_PULSE_TEST_MODE", "1");
    vi.stubEnv("PARIS_PULSE_RELATIVE_FIXTURES", "1");
    const data = previewForTests(future);
    expect(data.notices.every((n) => isPublicNotice(n, future))).toBe(true);
    expect(data.deadlines.every((d) => isPublicDeadline(d, future))).toBe(true);
    expect(data.notices[0].published_at).toBe("2031-10-26T16:00:00.000Z");
  });
  it.each([
    ["production", "1", "1"],
    ["test", "0", "1"],
    ["test", "1", "0"],
  ])(
    "never shifts recorded evidence without both test guards: %s/%s/%s",
    (node, mode, relative) => {
      vi.stubEnv("NODE_ENV", node);
      vi.stubEnv("PARIS_PULSE_TEST_MODE", mode);
      vi.stubEnv("PARIS_PULSE_RELATIVE_FIXTURES", relative);
      expect(previewForTests(future).notices[0].published_at).toBe(
        "2026-09-09T12:00:00-04:00",
      );
    },
  );
});
