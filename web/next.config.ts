import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root holds the legacy app's lockfile; pin the workspace to web/.
  turbopack: { root: __dirname },
  // Private app: no indexing, no framing (ADR-041).
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "same-origin" },
      ],
    }];
  },
};

export default nextConfig;
