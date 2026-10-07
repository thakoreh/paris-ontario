/** datetime-local controls display the editor's browser timezone, not UTC. */
export function localDateTimeInput(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${String(date.getFullYear()).padStart(4, "0")}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function savedLocalDateTime(
  value: string,
  original: unknown,
): string | null {
  if (!value) return null;
  // Preserve the original instant and precision on a no-op edit. Parsing an
  // overlapping DST hour again can otherwise select the other occurrence.
  if (typeof original === "string" && value === localDateTimeInput(original)) {
    return original;
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error("Enter a valid local date and time.");
  }
  const date = new Date(value);
  if (
    !Number.isFinite(date.getTime()) ||
    localDateTimeInput(date.toISOString()) !== value
  ) {
    // Date normalizes nonexistent spring-forward times and invalid calendar
    // dates. Reject those rather than silently saving a different wall time.
    throw new Error(
      "This local date and time does not exist. Choose another time.",
    );
  }
  return date.toISOString();
}
