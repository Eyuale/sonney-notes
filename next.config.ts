import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['canvas'],
  experimental: {
    turbo: {
      resolveAlias: {
        canvas: './lib/mock-canvas.js',  // We need to point to a mock or empty file, or just let it be handled by external packages
      }
    }
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }
    // Also ignore canvas on server side for webpack to be safe if strictly bundling
    if (isServer) {
      config.resolve.alias.canvas = false;
    }
    return config;
  },
};
export default nextConfig;
