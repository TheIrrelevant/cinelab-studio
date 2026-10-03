import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: [
    "@cinelab/core",
    "@cinelab/human",
    "@cinelab/character",
    "@cinelab/studio",
    "@cinelab/render-contract",
  ],
};

export default nextConfig;
