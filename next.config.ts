import type { NextConfig } from "next";

/**
 * Frontend only. Data comes from the QuestionBank Worker (Cloudflare), whose base URL is
 * NEXT_PUBLIC_AI_CORE_URL (e.g. https://questionbank-worker.<subdomain>.workers.dev).
 */
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
