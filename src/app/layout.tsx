import type { Metadata, Viewport } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Provider } from "@/components/provider";
import { Shell } from "@/components/shell";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title: {
    default: "Paris Pulse — Know what changed around you",
    template: "%s | Paris Pulse",
  },
  description:
    "Roads, construction, planning, recreation and important local updates for Paris, Ontario. Trusted sources, nearby notices and upcoming deadlines.",
  openGraph: {
    title: "Paris Pulse",
    description: "A little more in the know. Local changes for Paris, Ontario.",
    type: "website",
  },
  applicationName: "Paris Pulse",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#214f43",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Provider>
          <Shell>{children}</Shell>
        </Provider>
      </body>
    </html>
  );
}
