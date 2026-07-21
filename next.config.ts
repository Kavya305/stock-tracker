import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "yahoo-finance2"],
};

export default nextConfig;
