import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["googleapis"],
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
