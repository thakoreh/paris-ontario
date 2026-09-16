export type SharePlatform = {
  share?: (data: { title: string; url: string }) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

export type ShareOutcome = {
  status: "shared" | "copied" | "cancelled" | "manual";
  url: string;
};

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

export async function sharePublicLink(
  input: { base: string; publicPath: string; title: string },
  platform: SharePlatform,
): Promise<ShareOutcome> {
  const url = canonicalShareUrl(input.base, input.publicPath);
  if (platform.share) {
    try {
      await platform.share({ title: input.title, url });
      return { status: "shared", url };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { status: "cancelled", url };
      }
    }
  }

  if (platform.clipboard) {
    try {
      await platform.clipboard.writeText(url);
      return { status: "copied", url };
    } catch {
      return { status: "manual", url };
    }
  }

  return { status: "manual", url };
}
