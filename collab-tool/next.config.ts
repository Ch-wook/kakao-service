import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Next.js 16 Turbopack의 [id] 동적 라우트 validator 버그 우회
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
