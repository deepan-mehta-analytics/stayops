import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["host.docker.internal"],              // allow Docker MCP browser to load JS bundles in dev
};

export default nextConfig;
