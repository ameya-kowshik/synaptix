import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable experimental features that might cause Turbopack issues
  experimental: {
    turbo: undefined,
  },
}

export default nextConfig;
