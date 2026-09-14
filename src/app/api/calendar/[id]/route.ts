import { deadlineById } from "@/lib/repository";
import { calendarEvent } from "@/lib/calendar";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const d = await deadlineById(id);
  if (!d) return new Response("Not found", { status: 404 });
  return new Response(calendarEvent(d), {
    headers: {
      "Content-Type": "text/calendar;charset=utf-8",
      "Content-Disposition": `attachment; filename="paris-pulse-${d.id}.ics"`,
    },
  });
}
