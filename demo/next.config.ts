import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the Turbopack root to this project so an unrelated lockfile in the
  // home directory doesn't get picked as the workspace root.
  turbopack: {
    root: __dirname,
  },
  // Hide the dev-mode indicator badge so it never appears during the demo.
  devIndicators: false,
};

export default nextConfig;
