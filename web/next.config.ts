import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root holds the legacy app's lockfile; pin the workspace to web/.
  turbopack: { root: __dirname },
};

export default nextConfig;
