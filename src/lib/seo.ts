import type { Metadata } from "next";
import { normalizePublicUrl, sitePath, SITE_NAME } from "@/lib/site";

export const SOCIAL_IMAGE_PATH = "/opengraph-image";
export const SOCIAL_IMAGE_ALT = "Paris Pulse — local updates for Paris, Ontario";

export function publicRouteMetadata({
  title,
  description,
  path,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}): Metadata {
  const base = normalizePublicUrl();
  const url = sitePath(base, path) || path;
  const image = sitePath(base, SOCIAL_IMAGE_PATH) || SOCIAL_IMAGE_PATH;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      type,
      locale: "en_CA",
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: SOCIAL_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function privateRouteMetadata(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false },
    alternates: null,
    openGraph: null,
    twitter: null,
  };
}
