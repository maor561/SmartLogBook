import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root holds the legacy app's lockfile; pin the workspace to web/.
  turbopack: { root: __dirname },
  // Logbook restore uploads an exported .xlsx through a Server Action (ADR-013);
  // Vercel caps function bodies at 4.5 MB.
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
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
