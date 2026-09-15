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
