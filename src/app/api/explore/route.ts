import { publicData } from "@/lib/repository";
export const dynamic = "force-dynamic";
// Read-only public notice data; guides render independently of this request.
export async function GET() {
  try {
    const data = await publicData();
    if (data.error)
      return Response.json(
        { error: "Notice map unavailable" },
        { status: 503 },
      );
    return Response.json({ notices: data.notices });
  } catch {
    return Response.json({ error: "Notice map unavailable" }, { status: 503 });
  }
}
