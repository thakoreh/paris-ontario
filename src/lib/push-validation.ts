export function isSameOrigin(
  request: Request,
  configured = process.env.NEXT_PUBLIC_APP_URL,
) {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return (
      origin === new URL(configured || request.url).origin ||
      (process.env.NODE_ENV !== "production" &&
        origin === new URL(request.url).origin)
    );
  } catch {
    return false;
  }
}

export const MAX_PUSH_BODY_BYTES = 8 * 1024;
const MAX_ENDPOINT_LENGTH = 2048;

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export class PushValidationError extends Error {
  readonly status = 400;
}

export class PushBodyTooLargeError extends Error {
  readonly status = 413;

  constructor() {
    super("Push request body is too large.");
  }
}

const allowedHost = (hostname: string) =>
  hostname === "fcm.googleapis.com" ||
  (hostname.endsWith(".push.services.mozilla.com") &&
    hostname.length > ".push.services.mozilla.com".length) ||
  (hostname.endsWith(".push.apple.com") &&
    hostname.length > ".push.apple.com".length) ||
  (hostname.endsWith(".notify.windows.com") &&
    hostname.length > ".notify.windows.com".length);

function decodeBase64Url(value: unknown, name: string, expectedLength: number) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 512 ||
    !/^[A-Za-z0-9_-]+$/.test(value) ||
    value.length % 4 === 1
  ) {
    throw new PushValidationError(`${name} must be unpadded base64url.`);
  }
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const decoded = Buffer.from(padded, "base64");
  if (decoded.length !== expectedLength) {
    throw new PushValidationError(`${name} has an invalid length.`);
  }
  return value;
}

export function validatePushEndpoint(endpoint: unknown): string {
  if (
    typeof endpoint !== "string" ||
    endpoint.length === 0 ||
    endpoint.length > MAX_ENDPOINT_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(endpoint)
  ) {
    throw new PushValidationError("Endpoint must be a valid HTTPS push URL.");
  }
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new PushValidationError("Endpoint must be a valid HTTPS push URL.");
  }
  const authority = endpoint.slice("https://".length).split(/[/?#]/, 1)[0];
  if (
    url.protocol !== "https:" ||
    !allowedHost(url.hostname.toLowerCase()) ||
    url.username !== "" ||
    url.password !== "" ||
    authority.includes(":") ||
    url.port !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    url.pathname === "/"
  ) {
    throw new PushValidationError(
      "Endpoint must be a supported HTTPS push URL.",
    );
  }
  return endpoint;
}

export function parsePushSubscription(value: unknown): PushSubscriptionInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PushValidationError("Invalid push subscription.");
  }
  const input = value as Record<string, unknown>;
  if (
    !input.keys ||
    typeof input.keys !== "object" ||
    Array.isArray(input.keys)
  ) {
    throw new PushValidationError("Subscription keys are required.");
  }
  const keys = input.keys as Record<string, unknown>;
  const endpoint = validatePushEndpoint(input.endpoint);
  const p256dh = decodeBase64Url(keys.p256dh, "p256dh", 65);
  const auth = decodeBase64Url(keys.auth, "auth", 16);
  return { endpoint, keys: { p256dh, auth } };
}

export function parseUnsubscribeRequest(value: unknown): { endpoint: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PushValidationError("Invalid unsubscribe request.");
  }
  return {
    endpoint: validatePushEndpoint((value as Record<string, unknown>).endpoint),
  };
}

export async function readBoundedJson(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (
    contentLength &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > MAX_PUSH_BODY_BYTES
  ) {
    throw new PushBodyTooLargeError();
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_PUSH_BODY_BYTES) {
    throw new PushBodyTooLargeError();
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new PushValidationError("Request body must be valid JSON.");
  }
}
