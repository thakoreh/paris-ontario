// A complete response avoids App Router streaming turning a missing URL into 200.
// Middleware rewrites here without changing the URL requested by the visitor.
export function GET() {
  return new Response(`<!doctype html><html lang="en-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Update not found | Paris Pulse</title><style>body{margin:0;background:#eef4f3;color:#0f2e33;font:15px system-ui}main{max-width:720px;margin:48px auto;padding:24px}h1{font-size:32px}a{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;background:#155c57;color:white;border-radius:14px}</style></head><body><main><h1>This update isn’t here.</h1><p>It may have moved or may not be published yet.</p><a href="/">Back to today in Paris</a></main></body></html>`, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
