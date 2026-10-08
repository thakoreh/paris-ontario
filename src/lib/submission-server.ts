import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { createClient } from "@supabase/supabase-js";
import { serverClient } from "@/lib/supabase/server";

export const MAX_SUBMISSION_BODY_BYTES = 12 * 1024;

// Server-only settings. The named header must be overwritten by a trusted proxy;
// the app must not be directly reachable around that proxy. Never trust XFF.
export function submissionOrigin() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_APP_URL || "");
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      return "";
    if (
      url.protocol === "https:" ||
      (process.env.NODE_ENV !== "production" && url.protocol === "http:")
    )
      return url.origin;
  } catch {
    /* Missing or malformed canonical origin fails closed. */
  }
  return "";
}

export function submissionConfig() {
  const header = process.env.SUBMISSION_TRUSTED_IP_HEADER || "";
  const salt = process.env.SUBMISSION_RATE_LIMIT_SALT || "";
  const origin = submissionOrigin();
  const ready =
    process.env.COMMUNITY_SUBMISSIONS_ENABLED === "true" &&
    ["x-real-ip", "cf-connecting-ip"].includes(header) &&
    salt.length >= 32 &&
    !!origin &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { ready, header, salt, origin };
}

export function isSubmissionOrigin(request: Request) {
  const origin = submissionOrigin();
  return (
    !!origin &&
    request.headers.get("origin") === origin &&
    request.headers.get("sec-fetch-site") !== "cross-site"
  );
}

export function submissionClientHash(
  request: Request,
  config = submissionConfig(),
) {
  const address = request.headers.get(config.header)?.trim();
  if (!address || address.includes("%") || !isIP(address)) return null;
  let canonical = address;
  if (isIP(address) === 6) {
    // Collapse textual forms and temporary IPv6 addresses within the same /64.
    // IPv4-mapped IPv6 uses the same bucket as its IPv4 spelling.
    const host = new URL(`http://[${address}]/`).hostname.slice(1, -1);
    const [left, right] = host.split("::");
    const head = left ? left.split(":") : [];
    const tail = right ? right.split(":") : [];
    const groups =
      right === undefined
        ? head
        : [...head, ...Array(8 - head.length - tail.length).fill("0"), ...tail];
    const words = groups.map((part) => parseInt(part, 16));
    canonical =
      words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff
        ? `${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`
        : `${words
            .slice(0, 4)
            .map((word) => word.toString(16))
            .join(":")}::/64`;
  }
  return createHmac("sha256", config.salt).update(canonical).digest("hex");
}

// Kept separate from notification helpers: intake cannot send alerts.
export function submissionServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function submissionSession() {
  const db = await serverClient();
  if (!db) return null;
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  return !error && user ? { db, user } : null;
}

export function submissionResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

// Bound while streaming, including when Content-Length is missing or dishonest.
export async function readSubmissionJson(request: Request) {
  if (
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase() !== "application/json"
  )
    throw new Error("content-type");
  if (Number(request.headers.get("content-length")) > MAX_SUBMISSION_BODY_BYTES)
    throw new Error("size");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("body");
  let bytes = 0;
  const parts: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_SUBMISSION_BODY_BYTES) {
        await reader.cancel();
        throw new Error("size");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts)),
  ) as unknown;
}
