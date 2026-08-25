import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Banner/prize images and videos are now arbitrary admin-pasted URLs
    // (no more Firebase Storage), so the host can't be known in advance.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
