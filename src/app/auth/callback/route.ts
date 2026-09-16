import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { normalizePublicUrl } from "@/lib/site";
export async function GET(request: NextRequest) {
  const origin = normalizePublicUrl()?.origin || request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const db = await serverClient();
  if (code && db) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      const next = request.nextUrl.searchParams.get("next");
      return NextResponse.redirect(
        new URL(next === "/reset-password" ? next : "/onboarding", origin),
      );
    }
  }
  return NextResponse.redirect(
    new URL("/login?error=confirmation", origin),
  );
}
