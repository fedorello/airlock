import type { NextConfig } from "next";

// Pin the workspace root to this app: the monorepo has several lockfiles above,
// which Next would otherwise guess from (and warn about).
const nextConfig: NextConfig = {
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
