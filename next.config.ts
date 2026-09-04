import type { NextConfig } from "next";
import { adminFileUploadBodySizeLimit } from "./src/lib/upload-limits";

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains"
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()"
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value:
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://lf1-cdn-tos.bytegoofy.com; connect-src 'self' https:; frame-src 'self' https:"
  }
];

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      { source: "/enhe-ai", destination: "/about", statusCode: 301 },
      { source: "/en/enhe-ai", destination: "/en/about", statusCode: 301 },
      { source: "/account-services/gemini-pro", destination: "/account-services", statusCode: 301 },
      { source: "/en/account-services/gemini-pro", destination: "/en/account-services", statusCode: 301 },
      { source: "/ai-news/ai-2", destination: "/ai-news/tencent-cloud-efficiency-agent-tools", statusCode: 301 },
      { source: "/en/ai-news/ai-2", destination: "/en/ai-news/tencent-cloud-efficiency-agent-tools", statusCode: 301 },
      { source: "/ai-news/ai-3", destination: "/ai-news/how-to-choose-ai-tool-website", statusCode: 301 },
      { source: "/en/ai-news/ai-3", destination: "/en/ai-news/how-to-choose-ai-tool-website", statusCode: 301 },
      { source: "/ai-news/enhe-ai", destination: "/ai-news/enhe-ai-tool-station-user-guide", statusCode: 301 },
      { source: "/en/ai-news/enhe-ai", destination: "/en/ai-news/enhe-ai-tool-station-user-guide", statusCode: 301 },
      { source: "/ai-news/github-copilot-cli-ai-2", destination: "/ai-news/github-copilot-cli-ai", statusCode: 301 },
      { source: "/en/ai-news/github-copilot-cli-ai-2", destination: "/en/ai-news/github-copilot-cli-ai", statusCode: 301 },
      { source: "/ai-news/anolisa-ai-2", destination: "/ai-news/anolisa-ai", statusCode: 301 },
      { source: "/en/ai-news/anolisa-ai-2", destination: "/en/ai-news/anolisa-ai", statusCode: 301 },
      { source: "/ai-news/ai-7-2", destination: "/ai-news/ai-7", statusCode: 301 },
      { source: "/en/ai-news/ai-7-2", destination: "/en/ai-news/ai-7", statusCode: 301 },
      { source: "/software/zfb", destination: "/software/zfb-transfer-link-qr-code-generator", statusCode: 301 },
      { source: "/en/software/zfb", destination: "/en/software/zfb-transfer-link-qr-code-generator", statusCode: 301 },
      { source: "/skill-learning/ai-ai-ilo5a5", destination: "/skill-learning/ai-monetization-side-hustle-course", statusCode: 301 },
      { source: "/en/skill-learning/ai-ai-ilo5a5", destination: "/en/skill-learning/ai-monetization-side-hustle-course", statusCode: 301 },
      { source: "/okf", destination: "/okf/index.md", statusCode: 308 },
      { source: "/okf/", destination: "/okf/index.md", statusCode: 308 },
      { source: "/online-tools", destination: "/account-services", statusCode: 301 },
      { source: "/online-tools/:slug*", destination: "/account-services/:slug*", statusCode: 301 },
      { source: "/en/online-tools", destination: "/en/account-services", statusCode: 301 },
      { source: "/en/online-tools/:slug*", destination: "/en/account-services/:slug*", statusCode: 301 }
    ];
  },
  async headers() {
    const zhPublicCacheHeaders = [
      {
        key: "Cache-Control",
        value: "public, s-maxage=300, stale-while-revalidate=86400"
      },
      {
        key: "Content-Language",
        value: "zh-CN"
      }
    ];

    const enPublicCacheHeaders = [
      {
        key: "Cache-Control",
        value: "public, s-maxage=300, stale-while-revalidate=86400"
      },
      {
        key: "Content-Language",
        value: "en-US"
      }
    ];
    const publicAssetCacheHeaders = [
      {
        key: "Cache-Control",
        value: "public, s-maxage=300, stale-while-revalidate=86400"
      }
    ];

    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/robots.txt", headers: publicAssetCacheHeaders },
      { source: "/sitemap.xml", headers: publicAssetCacheHeaders },
      { source: "/llms.txt", headers: publicAssetCacheHeaders },
      { source: "/pricing.md", headers: publicAssetCacheHeaders },
      { source: "/okf/index.md", headers: publicAssetCacheHeaders },
      { source: "/okf/enhe-ai-overview.md", headers: publicAssetCacheHeaders },
      { source: "/okf/ai-news/index.md", headers: publicAssetCacheHeaders },
      { source: "/okf/software/index.md", headers: publicAssetCacheHeaders },
      { source: "/okf/account-services/index.md", headers: publicAssetCacheHeaders },
      { source: "/okf/skill-learning/index.md", headers: publicAssetCacheHeaders },
      { source: "/", headers: zhPublicCacheHeaders },
      { source: "/en", headers: enPublicCacheHeaders },
      { source: "/about", headers: zhPublicCacheHeaders },
      { source: "/en/about", headers: enPublicCacheHeaders },
      { source: "/software", headers: zhPublicCacheHeaders },
      { source: "/en/software", headers: enPublicCacheHeaders },
      { source: "/account-services", headers: zhPublicCacheHeaders },
      { source: "/en/account-services", headers: enPublicCacheHeaders },
      { source: "/skill-learning", headers: zhPublicCacheHeaders },
      { source: "/en/skill-learning", headers: enPublicCacheHeaders },
      { source: "/pricing", headers: zhPublicCacheHeaders },
      { source: "/en/pricing", headers: enPublicCacheHeaders },
      { source: "/tutorials", headers: zhPublicCacheHeaders },
      { source: "/en/tutorials", headers: enPublicCacheHeaders },
      { source: "/ai-news", headers: zhPublicCacheHeaders },
      { source: "/en/ai-news", headers: enPublicCacheHeaders },
      { source: "/ai-trends", headers: zhPublicCacheHeaders },
      { source: "/en/ai-trends", headers: enPublicCacheHeaders },
      { source: "/ai-news/:slug*", headers: zhPublicCacheHeaders },
      { source: "/en/ai-news/:slug*", headers: enPublicCacheHeaders },
      { source: "/legal/:slug*", headers: zhPublicCacheHeaders },
      { source: "/en/legal/:slug*", headers: enPublicCacheHeaders },
      { source: "/software/:slug*", headers: zhPublicCacheHeaders },
      { source: "/en/software/:slug*", headers: enPublicCacheHeaders },
      { source: "/account-services/:slug*", headers: zhPublicCacheHeaders },
      { source: "/en/account-services/:slug*", headers: enPublicCacheHeaders },
      { source: "/skill-learning/:slug*", headers: zhPublicCacheHeaders },
      { source: "/en/skill-learning/:slug*", headers: enPublicCacheHeaders },
      { source: "/tools/:slug*", headers: zhPublicCacheHeaders },
      { source: "/en/tools/:slug*", headers: enPublicCacheHeaders }
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "zpayz.cn" },
      { protocol: "https", hostname: "*.zpayz.cn" },
      { protocol: "https", hostname: "7-pay.cn" },
      { protocol: "https", hostname: "*.7-pay.cn" }
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: adminFileUploadBodySizeLimit
    }
  }
};

export default nextConfig;
