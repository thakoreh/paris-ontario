// Public build identifier only: a git SHA (7-40 hex chars) or null.
export function buildCommit(raw = process.env.SOURCE_COMMIT): string | null {
  const value = raw?.trim().toLowerCase();
  return value && /^[0-9a-f]{7,40}$/.test(value) ? value : null;
}
