import type { Metadata, Viewport } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Provider } from "@/components/provider";
import { Shell } from "@/components/shell";
import { StructuredData } from "@/components/structured-data";
import { FAVICON_METADATA } from "@/lib/favicon";
import { normalizePublicUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

const siteUrl = normalizePublicUrl();

export const metadata: Metadata = {
  metadataBase: siteUrl || undefined,
  title: {
    default: "Paris Pulse | Local updates for Paris, Ontario",
    template: "%s | Paris Pulse",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: siteUrl ? { canonical: "/" } : undefined,
  openGraph: {
    title: "Paris Pulse | Local updates for Paris, Ontario",
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "en_CA",
    url: siteUrl ? "/" : undefined,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary",
    title: "Paris Pulse | Local updates for Paris, Ontario",
    description: SITE_DESCRIPTION,
  },
  icons: FAVICON_METADATA,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#214f43",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <body>
        <StructuredData base={siteUrl} />
        <Provider>
          <Shell>{children}</Shell>
        </Provider>
      </body>
    </html>
  );
}
