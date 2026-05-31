import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  experimental: {
    parallelServerFunctions: true,
  },
}

export default nextConfig;
