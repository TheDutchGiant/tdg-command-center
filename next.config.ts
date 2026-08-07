import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["92.5.237.215"],

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;