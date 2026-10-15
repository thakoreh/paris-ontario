import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

// Run after a clean production build with this deliberately nonpersonal value.
// A build without the setting cannot prove removal of build-time inlining.
const canary = "privacy-canary@example.invalid";
assert.equal(process.env.NEXT_PUBLIC_SUPPORT_EMAIL, canary, "Build and run with the privacy canary setting.");

async function scan(directory, include) {
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) count += await scan(file, include);
    else if (include(entry.name)) {
      const content = await readFile(file, "utf8");
      assert.ok(!content.includes(canary) && !content.includes(encodeURIComponent(canary)), `Public contact recipient leaked into ${file}`);
      count += 1;
    }
  }
  return count;
}

const assets = await scan(".next/static", () => true);
const pages = await scan(".next/server/app", (name) => /\.(html|rsc|body)$/.test(name));
assert.ok(assets > 0, "No public build assets were checked.");
assert.ok(pages > 0, "No prerendered responses were checked.");
console.log(`Contact privacy passed: ${assets} public assets and ${pages} prerendered responses contain no legacy recipient.`);
