import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { verifiedPreview } from "@/data/verified-preview";
import { isPublicDeadline, isPublicNotice } from "@/lib/public-content";
import { canonicalWwwRedirect } from "@/lib/site";

const staticRoutes = new Set([
  "/",
  "/today",
  "/storm",
  "/deadlines",
  "/map",
  "/events",
  "/paris-ontario",
  "/services",
  "/new-to-paris",
  "/notifications",
  "/push-sw.js",
  "/sources",
  "/about",
  "/disclaimer",
  "/editorial-policy",
  "/privacy",
  "/terms",
  "/contact",
  "/auth/callback",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/app",
  "/app/feed",
  "/app/map",
  "/app/saved",
  "/app/deadlines",
  "/app/locations",
  "/app/locations/new",
  "/app/alerts",
  "/app/settings",
  "/admin",
  "/admin/notices",
  "/admin/deadlines",
  "/admin/sources",
  "/admin/review",
  "/admin/ingestion",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/opengraph-image",
  "/_not-found",
]);

function notFoundResponse(request: NextRequest) {
  return NextResponse.rewrite(new URL("/_not-found", request.url), {
    status: 404,
  });
}

function isSystemPath(pathname: string) {
  return pathname.startsWith("/_next/") || pathname.startsWith("/api/");
}

function previewMode() {
  return (
    process.env.PARIS_PULSE_TEST_MODE === "1" &&
    process.env.NODE_ENV !== "production"
  );
}

type Clock = () => Date;

export function createMiddleware(now: Clock = () => new Date()) {
  return async function middleware(request: NextRequest) {
    const canonicalRedirect = canonicalWwwRedirect(
      process.env.NEXT_PUBLIC_APP_URL,
      request.nextUrl,
      request.headers.get("host"),
    );
    if (canonicalRedirect) return NextResponse.redirect(canonicalRedirect, 308);

    const { pathname } = request.nextUrl;
    if (isSystemPath(pathname) || staticRoutes.has(pathname)) {
      let response = NextResponse.next({ request });
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
        return response;
      const client = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: (items) => {
              items.forEach(({ name, value }) => request.cookies.set(name, value));
              response = NextResponse.next({ request });
              items.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options),
              );
            },
          },
        },
      );
      await client.auth.getUser();
      return response;
    }

    const [, type, value, ...rest] = pathname.split("/");
    if (rest.length || !value || !["notice", "deadline"].includes(type)) {
      return notFoundResponse(request);
    }

    const current = now();
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      if (previewMode()) {
        const exists =
          type === "notice"
            ? verifiedPreview.notices.some(
                (notice) =>
                  notice.slug === value && isPublicNotice(notice, current),
              )
            : verifiedPreview.deadlines.some(
                (deadline) =>
                  deadline.id === value && isPublicDeadline(deadline, current),
              );
        return exists ? NextResponse.next({ request }) : notFoundResponse(request);
      }
      return notFoundResponse(request);
    }

    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } },
    );
    const nowIso = current.toISOString();
    const query =
      type === "notice"
        ? client
            .from("notices")
            .select("id")
            .eq("slug", value)
            .eq("verification_status", "verified")
            .eq("is_sample", false)
            .lte("published_at", nowIso)
            .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
            .or(`end_at.is.null,end_at.gt.${nowIso}`)
            .maybeSingle()
        : client
            .from("deadlines")
            .select("id")
            .eq("id", value)
            .eq("is_sample", false)
            .not("verified_at", "is", null)
            .gt("deadline_at", nowIso)
            .maybeSingle();
    const { data } = await query;
    return data ? NextResponse.next({ request }) : notFoundResponse(request);
  };
}

export const middleware = createMiddleware();

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-192.png|apple-touch-icon.png).*)",
  ],
};
