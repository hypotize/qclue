import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@qclue/qr", "@qclue/ai", "@qclue/db"],
};

export default nextConfig;
