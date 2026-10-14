import React from "react";
import { SITE_DESCRIPTION, SITE_NAME, sitePath } from "@/lib/site";

export function StructuredData({ base }: { base: URL | null }) {
  const url = sitePath(base);
  if (!url) return null;

  const graph = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url,
      description: SITE_DESCRIPTION,
      areaServed: {
        "@type": "City",
        name: "Paris",
        address: { "@type": "PostalAddress", addressRegion: "ON", addressCountry: "CA" },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url,
      description: SITE_DESCRIPTION,
      inLanguage: "en-CA",
      areaServed: "Paris, Ontario, Canada",
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}

export function EventStructuredData({ notice }: { notice: import("@/types").Notice }) {
  if (notice.is_sample || notice.verification_status !== "verified" || !notice.start_at) return null;
  const event = {
    "@context": "https://schema.org", "@type": "Event", name: notice.title,
    startDate: notice.start_at, ...(notice.end_at ? { endDate: notice.end_at } : {}),
    description: notice.summary, url: notice.official_url,
    ...(notice.address_text ? { location: { "@type": "Place", name: notice.address_text } } : {}),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(event).replace(/</g, "\\u003c") }} />;
}
