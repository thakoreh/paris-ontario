import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const script = path.resolve(__dirname, "../scripts/verify-contact-privacy.mjs");
const canary = "privacy-canary@example.invalid";
let root: string;

function write(file: string, content = "clean") {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

async function verify(setting = canary) {
  const { verifyContactPrivacy } = await import(script);
  try {
    await verifyContactPrivacy({ root, setting });
    return { status: 0, output: "" };
  } catch (error) {
    return { status: 1, output: String(error) };
  }
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "contact-privacy-"));
  write(".next/static/chunks/app.js");
  write(".next/server/app/index.html");
  mkdirSync(path.join(root, "public"));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("contact privacy build verifier", () => {
  it.each([
    "public/nested/contact.txt",
    ".next/standalone/public/nested/contact.txt",
    ".next/standalone/.next/static/chunks/app.js",
    ".next/static/chunks/app.js",
    ".next/server/app/index.html",
  ])("rejects a canary in %s", async (file) => {
    write(file, canary);
    const result = await verify();
    expect(result.status).not.toBe(0);
    expect(result.output).toContain(`Public contact recipient leaked into ${path.join(root, file)}`);
  });

  it.each([
    encodeURIComponent(canary),
    "PRIVACY-CANARY%40EXAMPLE.INVALID",
    `mailto:${canary}`,
    String.raw`{"email":"privacy-canary\u0040example.invalid"}`,
    String.raw`"privacy-canary\u{40}example.invalid"`,
    String.raw`"privacy-canary\x40example.invalid"`,
    "privacy-canary&#64;example.invalid",
    "privacy-canary&#x40;example.invalid",
    '"privacy-canary"+"@example.invalid"',
    "'privacy-' + 'canary' + '@example.invalid'",
    String.raw`"privacy-canary" + "\u0040example.invalid"`,
  ])("rejects encoded or split recipient %s", async (content) => {
    write(".next/static/chunks/app.js", content);
    const result = await verify();
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("Public contact recipient leaked into");
  });

  it("accepts a clean tree with optional deployed copies", async () => {
    write("public/nested/asset.txt");
    write(".next/standalone/public/asset.txt");
    write(".next/standalone/.next/static/app.js");
    expect((await verify()).status).toBe(0);
  });

  it("rejects excessive nested encoding loudly in under two seconds", async () => {
    const file = "public/nested/encoded.js";
    write(file, `const data="${"%" + "25".repeat(100000) + "40"}"`);
    const { verifyContactPrivacy } = await import(script);
    const started = performance.now();
    await expect(verifyContactPrivacy({ root, setting: canary })).rejects.toThrow(
      `decoding did not converge after 8 passes in ${path.join(root, file)}; treating as unsafe`,
    );
    expect(performance.now() - started).toBeLessThan(2000);
  });

  it("decodes a large benign file in under one second", async () => {
    write("public/large.txt", "benign%20text%21\n".repeat(65536));
    const { verifyContactPrivacy } = await import(script);
    const started = performance.now();
    await expect(verifyContactPrivacy({ root, setting: canary })).resolves.toBeUndefined();
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it("detects a recipient with three layers of percent encoding", async () => {
    write("public/encoded.txt", "privacy-canary%252540example.invalid");
    const result = await verify();
    expect(result.status).toBe(1);
    expect(result.output).toContain(`Public contact recipient leaked into ${path.join(root, "public/encoded.txt")}`);
  });

  it("accepts a clean tree without optional deployed copies", async () => {
    expect((await verify()).status).toBe(0);
  });

  it.each(["public", ".next/static", ".next/server/app"])("fails if required directory %s is missing", async (directory) => {
    rmSync(path.join(root, directory), { recursive: true });
    const result = await verify();
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("ENOENT");
    expect(result.output).toContain(path.join(root, directory));
  });

  it.each([
    [".next/static/chunks/app.js", "No public build assets were checked."],
    [".next/server/app/index.html", "No prerendered responses were checked."],
  ])("fails for an empty build after removing %s", async (file, message) => {
    rmSync(path.join(root, file));
    const result = await verify();
    expect(result.status).not.toBe(0);
    expect(result.output).toContain(message);
  });

  it("requires the canary environment setting", async () => {
    const result = await verify("");
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("Build and run with the privacy canary setting.");
  });
});
