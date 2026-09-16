import { searchAddresses } from "@/lib/address-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3)
    return Response.json(
      { error: "Enter at least 3 characters to search an address." },
      { status: 400 },
    );
  if (query.length > 100)
    return Response.json({ error: "Address search is too long." }, { status: 400 });

  try {
    return Response.json(await searchAddresses(query), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Address search is temporarily unavailable." },
      { status: 502 },
    );
  }
}
