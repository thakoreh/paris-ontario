import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  const dataBackendConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return NextResponse.json(
    {
      ok: true,
      service: "paris-pulse",
      dataMode: dataBackendConfigured ? "supabase" : "preview",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
