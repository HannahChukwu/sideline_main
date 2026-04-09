import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/manager", destination: "/designer", permanent: true },
      { source: "/manager/editor", destination: "/designer/editor", permanent: true },
      { source: "/designer/program", destination: "/designer/team", permanent: true },
    ];
  },
  reactCompiler: true,
  // Webpack resolves `cookie` for @supabase/ssr to a nested path that npm may not
  // populate when deduping; force the hoisted install (see cookie@1.x for @supabase/ssr).
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      cookie: path.join(process.cwd(), "node_modules", "cookie"),
    };
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // DALL-E 3 generated image CDN
        protocol: "https",
        hostname: "*.blob.core.windows.net",
      },
      {
        protocol: "https",
        hostname: "oaidalleapiprodscus.blob.core.windows.net",
      },
      {
        protocol: "https",
        hostname: "replicate.delivery",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
