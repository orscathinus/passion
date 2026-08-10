import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.HOSTINGER_BUILD === "1" ? "export" : undefined,
  trailingSlash: true,
};

export default nextConfig;
