import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Keep descriptions in <head> for HTML-only SEO checks, including Lighthouse.
  htmlLimitedBots: /.*/,
  outputFileTracingRoot: process.cwd(),
  async redirects() {
    // Explicit 301s meet the legacy URL contract (permanent: true uses 308).
    return [
      { source: "/today", destination: "/", statusCode: 301 },
      { source: "/app", destination: "/", statusCode: 301 },
      { source: "/map", destination: "/explore", statusCode: 301 },
      { source: "/app/feed", destination: "/explore", statusCode: 301 },
    ];
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default config;
