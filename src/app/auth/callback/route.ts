import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const db = await serverClient();
  if (code && db) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      const next = request.nextUrl.searchParams.get("next");
      return NextResponse.redirect(
        new URL(next === "/reset-password" ? next : "/onboarding", request.url),
      );
    }
  }
  return NextResponse.redirect(
    new URL("/login?error=confirmation", request.url),
  );
}
