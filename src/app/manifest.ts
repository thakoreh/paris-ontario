import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Paris Pulse",
    short_name: "Paris Pulse",
    description: "Local changes around the places you care about.",
    start_url: "/today",
    display: "standalone",
    background_color: "#f7f8f5",
    theme_color: "#214f43",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
