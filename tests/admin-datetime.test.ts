import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { localDateTimeInput, savedLocalDateTime } from "@/lib/admin-datetime";

// TZ must be set before Node starts. Mutating process.env.TZ in a Vitest
// worker thread does not reliably update Date's timezone across platforms.
function inTimezone(zone: string, code: string): unknown {
  const moduleUrl = pathToFileURL(
    path.resolve("src/lib/admin-datetime.ts"),
  ).href;
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "-e",
        `import { localDateTimeInput, savedLocalDateTime } from ${JSON.stringify(moduleUrl)};
     console.log(JSON.stringify((() => { ${code} })()));`,
      ],
      { env: { ...process.env, TZ: zone }, encoding: "utf8" },
    ),
  );
}

describe("editor local datetime round trips", () => {
  it.each([
    ["America/Toronto", "2026-07-01T14:30:45.123456+00:00", "2026-07-01T10:30"],
    ["America/Toronto", "2026-01-01T02:30:45.123Z", "2025-12-31T21:30"],
    ["Asia/Kolkata", "2026-07-01T14:30:45.123Z", "2026-07-01T20:00"],
    ["UTC", "2026-07-01T14:30:45.123Z", "2026-07-01T14:30"],
  ])(
    "uses %s local time and preserves unchanged precision",
    (zone, stored, local) => {
      expect(
        inTimezone(
          zone,
          `
      const stored = ${JSON.stringify(stored)};
      const display = localDateTimeInput(stored);
      return [display, savedLocalDateTime(display, stored)];
    `,
        ),
      ).toEqual([local, stored]);
    },
  );

  it("preserves both occurrences of the fall-back hour exactly", () => {
    const stored = [
      "2026-11-01T05:30:59.999Z",
      "2026-11-01T06:30:12.123456+00:00",
    ];
    expect(
      inTimezone(
        "America/Toronto",
        `
      return ${JSON.stringify(stored)}.map(value => [
        localDateTimeInput(value), savedLocalDateTime("2026-11-01T01:30", value)
      ]);
    `,
      ),
    ).toEqual(stored.map((value) => ["2026-11-01T01:30", value]));
  });

  it("converts a changed local wall time to UTC", () => {
    expect(
      inTimezone(
        "America/Toronto",
        `
      return savedLocalDateTime("2026-07-01T11:30", "2026-07-01T14:30:45.123Z");
    `,
      ),
    ).toBe("2026-07-01T15:30:00.000Z");
  });

  it("rejects nonexistent spring-forward times and invalid dates", () => {
    expect(
      inTimezone(
        "America/Toronto",
        `
      return ["2026-03-08T02:30", "2026-02-30T12:00", "bad date", "2026-07-01T12:00Z"].map(value => {
        try { savedLocalDateTime(value, null); return false; }
        catch { return true; }
      });
    `,
      ),
    ).toEqual([true, true, true, true]);
  });

  it("supports clearing an optional timestamp and empty new fields", () => {
    expect(savedLocalDateTime("", "2026-07-01T14:30:00Z")).toBeNull();
    expect(localDateTimeInput(null)).toBe("");
    expect(localDateTimeInput("invalid")).toBe("");
  });

  it("wires both editor fields to the tested local roundtrip helpers", () => {
    const editor = fs.readFileSync("src/components/admin.tsx", "utf8");
    for (const field of ["expires_at", "deadline_at"]) {
      expect(editor).toContain(`localDateTimeInput(initial.${field})`);
      expect(editor).toContain(`row.${field} = savedLocalDateTime(`);
    }
  });
});
