import type { NextConfig } from "next";

// Pin the workspace root to this app: the monorepo has several lockfiles above,
// which Next would otherwise guess from (and warn about).
const nextConfig: NextConfig = {
  // A self-contained server bundle for a small Docker runtime image.
  output: "standalone",
  turbopack: { root: import.meta.dirname },
  // The standalone trace root is the app itself (the monorepo has lockfiles above).
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
