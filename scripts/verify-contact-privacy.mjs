import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Run after a clean production build with this deliberately nonpersonal value.
// A build without the setting cannot prove removal of build-time inlining.
const canary = "privacy-canary@example.invalid";

// Decode text only: never evaluate scripts found in a build or public asset.
function normalize(content) {
  let previous;
  do {
    previous = content;
    content = content
      .replace(/\\u\{([\da-f]+)\}|\\u([\da-f]{4})|\\x([\da-f]{2})/gi, (match, braced, unicode, hex) => {
        const code = parseInt(braced ?? unicode ?? hex, 16);
        return code <= 0x10ffff ? String.fromCodePoint(code) : match;
      })
      .replace(/&#(?:x([\da-f]+)|(\d+));/gi, (match, hex, decimal) => {
        const code = parseInt(hex ?? decimal, hex ? 16 : 10);
        return code <= 0x10ffff ? String.fromCodePoint(code) : match;
      })
      .replace(/&(commat|quot|apos|amp);/gi, (_, name) => ({ commat: "@", quot: '"', apos: "'", amp: "&" })[name.toLowerCase()])
      .replace(/%([\da-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/["'`]\s*\+\s*["'`]/g, "");
  } while (content !== previous);
  return content.toLowerCase();
}

async function scan(directory, include, optional = false) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (optional && error.code === "ENOENT") return 0;
    throw error;
  }
  let count = 0;
  for (const entry of entries) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) count += await scan(file, include);
    else if (include(entry.name)) {
      const content = await readFile(file, "utf8");
      assert.ok(!normalize(content).includes(canary), `Public contact recipient leaked into ${file}`);
      count += 1;
    }
  }
  return count;
}

export async function verifyContactPrivacy({
  root = process.env.CONTACT_PRIVACY_ROOT || process.cwd(),
  setting = process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
} = {}) {
  assert.equal(setting, canary, "Build and run with the privacy canary setting.");
  root = resolve(root);
  const assets = await scan(join(root, ".next/static"), () => true);
  const pages = await scan(join(root, ".next/server/app"), (name) => /\.(html|rsc|body)$/.test(name));
  const publicAssets = await scan(join(root, "public"), () => true);
  const deployedPublic = await scan(join(root, ".next/standalone/public"), () => true, true);
  const deployedStatic = await scan(join(root, ".next/standalone/.next/static"), () => true, true);
  assert.ok(assets > 0, "No public build assets were checked.");
  assert.ok(pages > 0, "No prerendered responses were checked.");
  console.log(`Contact privacy passed: ${assets + publicAssets + deployedPublic + deployedStatic} public assets and ${pages} prerendered responses contain no legacy recipient.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await verifyContactPrivacy();
}
