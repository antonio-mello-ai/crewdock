import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@aios/shared"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
