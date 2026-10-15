import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("lets notice titles wrap and their flex container shrink", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const baseRule = (selector: string) =>
    css.match(new RegExp(`^\\.${selector}\\s*\\{([^}]+)\\}`, "m"))?.[1];
  expect(baseRule("notice-title")).toMatch(/overflow-wrap:\s*anywhere\s*;/);
  expect(baseRule("notice-main")).toMatch(/min-width:\s*0\s*;/);
});
