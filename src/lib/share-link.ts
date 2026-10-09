export type SharePlatform = {
  share?: (data: { title: string; url: string }) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

export type ShareInput = {
  base: string;
  publicPath: string;
  title: string;
};

export type ShareChannel = "whatsapp" | "email";

export type ShareOutcome = {
  status: "shared" | "copied" | "cancelled" | "manual";
  url: string;
};

export function noticeSharePath(slug: string): string {
  if (!slug || /[\\\u0000-\u001F\u007F]/.test(slug)) {
    throw new Error("A notice slug is required for a public share path.");
  }
  return `/notice/${encodeURIComponent(slug)}`;
}

export function canonicalShareUrl(base: string, publicPath: string): string {
  const origin = new URL(base);
  if (
    origin.protocol !== "https:" ||
    !publicPath.startsWith("/") ||
    publicPath.startsWith("//") ||
    /[\\\u0000-\u001F\u007F]/.test(publicPath)
  ) {
    throw new Error("A public HTTPS origin and site-relative path are required.");
  }

  const url = new URL(publicPath, origin.origin);
  if (url.origin !== origin.origin) {
    throw new Error("A public HTTPS origin and site-relative path are required.");
  }

  url.search = "";
  url.hash = "";
  return url.toString();
}

export function shareChannelUrl(
  channel: ShareChannel,
  input: ShareInput,
): string | null {
  try {
    const url = canonicalShareUrl(input.base, input.publicPath);
    if (channel === "whatsapp") {
      return `https://wa.me/?text=${encodeURIComponent(`${input.title}\n${url}`)}`;
    }

    return `mailto:?subject=${encodeURIComponent(input.title)}&body=${encodeURIComponent(`${input.title}\n\n${url}`)}`;
  } catch {
    return null;
  }
}

export async function copyPublicLink(
  input: ShareInput,
  platform: Pick<SharePlatform, "clipboard">,
): Promise<ShareOutcome> {
  const url = canonicalShareUrl(input.base, input.publicPath);
  if (platform.clipboard) {
    try {
      await platform.clipboard.writeText(url);
      return { status: "copied", url };
    } catch {
      // Continue to the selectable fallback when clipboard access is denied.
    }
  }

  return { status: "manual", url };
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

export async function sharePublicLink(
  input: ShareInput,
  platform: SharePlatform,
): Promise<ShareOutcome> {
  const url = canonicalShareUrl(input.base, input.publicPath);
  if (platform.share) {
    try {
      await platform.share({ title: input.title, url });
      return { status: "shared", url };
    } catch (error) {
      if (isAbortError(error)) {
        return { status: "cancelled", url };
      }
    }
  }

  return copyPublicLink(input, platform);
}
