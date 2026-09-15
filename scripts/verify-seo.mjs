const canonicalBase = new URL(
  process.env.SEO_AUDIT_URL || process.env.SEO_AUDIT_TARGET_URL || "http://127.0.0.1:3000",
);
canonicalBase.pathname = "/";
canonicalBase.search = "";
const targetBase = new URL(process.env.SEO_AUDIT_TARGET_URL || canonicalBase);
targetBase.pathname = "/";
targetBase.search = "";

const checks = [];

async function fetchRoute(path) {
  const url = new URL(path, targetBase);
  const response = await fetch(url, { redirect: "manual" });
  const body = await response.text();
  return { path, response, body };
}

function expect(check, detail) {
  checks.push({ check, detail });
}

const root = await fetchRoute("/");
const robots = await fetchRoute("/robots.txt");
const sitemap = await fetchRoute("/sitemap.xml");
const llms = await fetchRoute("/llms.txt");
const login = await fetchRoute("/login");
const missing = await fetchRoute("/notice/this-page-does-not-exist");
const trustRoutes = await Promise.all(
  ["/editorial-policy", "/privacy", "/terms", "/contact"].map(fetchRoute),
);

expect(root.response.status === 200, `GET / returned ${root.response.status}`);
expect(
  root.body.includes(`rel="canonical" href="${canonicalBase.toString().replace(/\/$/, "")}"`),
  "Homepage canonical does not match SEO_AUDIT_URL",
);
expect(
  (root.body.match(/<script[^>]+type="application\/ld\+json"/g) || []).length === 1,
  "Homepage must emit exactly one JSON-LD block",
);
expect(
  root.body.includes('property="og:locale" content="en_CA"'),
  "Homepage is missing the Canadian OpenGraph locale",
);
expect(
  robots.response.status === 200 &&
    ["OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot"].every((bot) =>
      robots.body.includes(bot),
    ),
  "robots.txt must allow the configured AI retrieval crawlers",
);
expect(
  sitemap.response.status === 200 &&
    ["/editorial-policy", "/privacy", "/terms", "/contact"].every((route) =>
      sitemap.body.includes(new URL(route, canonicalBase).toString()),
    ),
  "Sitemap is missing one or more trust routes",
);
expect(
  llms.response.status === 200 &&
    llms.body.includes("original official source") &&
    llms.body.includes("not an emergency service"),
  "llms.txt is missing source or emergency-use guidance",
);
expect(
  login.response.status === 200 &&
    login.body.includes('name="robots" content="noindex, nofollow"'),
  "Login must be noindex, nofollow",
);
expect(
  missing.response.status === 404 &&
    (missing.body.match(/name="robots" content="noindex"/g) || []).length === 1,
  "Missing public content must return one noindex 404 response",
);
expect(
  trustRoutes.every(({ response }) => response.status === 200),
  "One or more trust routes did not return HTTP 200",
);

const failures = checks.filter(({ check }) => !check);
if (failures.length) {
  console.error("SEO verification failed:");
  for (const { detail } of failures) console.error(`- ${detail}`);
  process.exit(1);
}

console.log(`SEO verification passed (${checks.length} checks) for ${canonicalBase}`);
