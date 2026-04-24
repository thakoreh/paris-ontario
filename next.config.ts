import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: "/paris-ontario",
  assetPrefix: "/paris-ontario/",
};

export default nextConfig;
