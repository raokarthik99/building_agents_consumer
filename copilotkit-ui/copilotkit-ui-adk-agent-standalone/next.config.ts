import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "logos.composio.dev",
      },
    ],
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;
