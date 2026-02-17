import type { NextConfig } from "next";

// GitHub Pages 會把網站放在 /<repo-name>/ 子路徑下。
// 在 GitHub Actions 裡我們會設定 NEXT_PUBLIC_BASE_PATH=/<repo-name>
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
