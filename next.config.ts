import type { NextConfig } from "next";
import path from "node:path";
import { adminFileUploadBodySizeLimit } from "./src/lib/upload-limits";

const defaultAppUrl = "https://www.enhe-tech.com.cn";
const adminVisualFixtureEnabled = process.env.ENHE_ADMIN_VISUAL_FIXTURE === "1";

if (adminVisualFixtureEnabled) {
  const fixtureOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "";
  let fixtureUrl: URL;
  try {
    fixtureUrl = new URL(fixtureOrigin);
  } catch {
    throw new Error("The admin visual fixture requires a loopback NEXT_PUBLIC_APP_URL.");
  }

  if (
    process.env.NODE_ENV === "production" ||
    ["DATABASE_URL", "DIRECT_URL", "SEO_AUDIT_TEST_DATABASE_URL"].some((key) =>
      Boolean(process.env[key]?.trim()),
    ) ||
    (fixtureUrl.protocol !== "http:" && fixtureUrl.protocol !== "https:") ||
    !["localhost", "127.0.0.1", "::1"].includes(fixtureUrl.hostname)
  ) {
    throw new Error("The admin visual fixture is limited to local database-free HTTP(S) development.");
  }
}

function getCspReportingEndpoint() {
  try {
    const appUrl = new URL(
      process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? defaultAppUrl,
    );
    if (appUrl.protocol !== "https:" && appUrl.protocol !== "http:") {
      return `${defaultAppUrl}/api/csp-report`;
    }
    return new URL("/api/csp-report", appUrl.origin).toString();
  } catch {
    return `${defaultAppUrl}/api/csp-report`;
  }
}

const cspReportingEndpoint = getCspReportingEndpoint();

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
    key: "Reporting-Endpoints",
    value: `csp-endpoint="${cspReportingEndpoint}"`
  },
  {
    key: "Report-To",
    value: JSON.stringify({
      group: "csp-endpoint",
      max_age: 10886400,
      endpoints: [{ url: cspReportingEndpoint }]
    })
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value:
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://lf1-cdn-tos.bytegoofy.com; connect-src 'self' https:; frame-src 'self' https:; report-uri /api/csp-report; report-to csp-endpoint"
  }
];

const nextConfig: NextConfig = {
  ...(adminVisualFixtureEnabled ? { distDir: ".next-admin-visual" } : {}),
  output: "standalone",
  outputFileTracingRoot: path.resolve(process.cwd()),
  htmlLimitedBots: /.*/,
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
      { source: "/software/lumios-personal-ai-companion", destination: "/ai-news/chatbox-to-personal-ai-companion-desktop-execution", statusCode: 301 },
      { source: "/en/software/lumios-personal-ai-companion", destination: "/en/ai-news/chatbox-to-personal-ai-companion-desktop-execution", statusCode: 301 },
      { source: "/account-services/your-ai-account-needs-covered-contact-customer-service-if-you-need-assistance", destination: "/account-services", statusCode: 301 },
      { source: "/en/account-services/your-ai-account-needs-covered-contact-customer-service-if-you-need-assistance", destination: "/en/account-services", statusCode: 301 },
      { source: "/skill-learning/high-frequency-ai-prompts-daily-life-work-learning-teaching", destination: "/skill-learning/high-frequency-ai-prompts-for-work-learning-and-teaching", statusCode: 301 },
      { source: "/tools/high-frequency-ai-prompts-daily-life-work-learning-teaching", destination: "/skill-learning/high-frequency-ai-prompts-for-work-learning-and-teaching", statusCode: 301 },
      { source: "/tools/mobile-chat-screenshot-maker-no-code-required-easy-to-use-ultimate-version", destination: "/software/no-code-chat-screenshot-maker", statusCode: 301 },
      { source: "/software/mobile-chat-screenshot-maker-no-code-required-easy-to-use-ultimate-version", destination: "/software/no-code-chat-screenshot-maker", statusCode: 301 },
      { source: "/tools/ai-voice-generator-flexible-edition", destination: "/software/local-ai-voice-generator-for-voiceover-materials", statusCode: 301 },
      { source: "/software/ai-voice-generator-flexible-edition", destination: "/software/local-ai-voice-generator-for-voiceover-materials", statusCode: 301 },
      { source: "/skill-learning-3", destination: "/skill-learning", statusCode: 301 },
      { source: "/uploads/1780672763703-tool-product-tool-mq12l5w6-chatgpt-image-2026-6-4-22-18-45-2-.png-2", destination: "/uploads/1780672763703-tool-product-tool-mq12l5w6-chatgpt-image-2026-6-4-22-18-45-2-.png", statusCode: 301 },
      { source: "/uploads/1781369296949-tool-product-gemini-12-20-80-chatgpt-image-2026-6-13-14-15-46.png-0", destination: "/uploads/1781369296949-tool-product-gemini-12-20-80-chatgpt-image-2026-6-13-14-15-46.png", statusCode: 301 },
      { source: "/uploads/1781699117927-tool-product-faceswap-studio-ai-chatgpt-image-2026-6-17-20-24-09-5-.png-5", destination: "/uploads/1781699117927-tool-product-faceswap-studio-ai-chatgpt-image-2026-6-17-20-24-09-5-.png", statusCode: 301 },
      { source: "/okf", destination: "/okf/index.md", statusCode: 308 },
      { source: "/okf/", destination: "/okf/index.md", statusCode: 308 },
      { source: "/online-tools", destination: "/account-services", statusCode: 301 },
      { source: "/en/online-tools", destination: "/en/account-services", statusCode: 301 },
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
    const pricingAssetCacheHeaders = [
      {
        key: "Cache-Control",
        value: "public, s-maxage=300, stale-while-revalidate=300"
      }
    ];
    const zhPricingCacheHeaders = [
      ...pricingAssetCacheHeaders,
      { key: "Content-Language", value: "zh-CN" }
    ];
    const enPricingCacheHeaders = [
      ...pricingAssetCacheHeaders,
      { key: "Content-Language", value: "en-US" }
    ];

    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/robots.txt", headers: publicAssetCacheHeaders },
      { source: "/sitemap.xml", headers: publicAssetCacheHeaders },
      { source: "/llms.txt", headers: publicAssetCacheHeaders },
      { source: "/pricing.md", headers: pricingAssetCacheHeaders },
      { source: "/okf/index.md", headers: publicAssetCacheHeaders },
      { source: "/okf/enhe-ai-overview.md", headers: publicAssetCacheHeaders },
      { source: "/okf/ai-news/index.md", headers: publicAssetCacheHeaders },
      { source: "/okf/software/index.md", headers: publicAssetCacheHeaders },
      { source: "/okf/build-your-own-x/index.md", headers: publicAssetCacheHeaders },
      { source: "/okf/account-services/index.md", headers: publicAssetCacheHeaders },
      { source: "/okf/skill-learning/index.md", headers: publicAssetCacheHeaders },
      { source: "/", headers: zhPublicCacheHeaders },
      { source: "/en", headers: enPublicCacheHeaders },
      { source: "/about", headers: zhPublicCacheHeaders },
      { source: "/en/about", headers: enPublicCacheHeaders },
      { source: "/build-your-own-x", headers: zhPublicCacheHeaders },
      { source: "/en/build-your-own-x", headers: enPublicCacheHeaders },
      { source: "/ai-topics", headers: zhPublicCacheHeaders },
      { source: "/en/ai-topics", headers: enPublicCacheHeaders },
      { source: "/software", headers: zhPublicCacheHeaders },
      { source: "/en/software", headers: enPublicCacheHeaders },
      { source: "/ai-skills", headers: zhPublicCacheHeaders },
      { source: "/en/ai-skills", headers: enPublicCacheHeaders },
      { source: "/account-services", headers: zhPublicCacheHeaders },
      { source: "/en/account-services", headers: enPublicCacheHeaders },
      { source: "/skill-learning", headers: zhPublicCacheHeaders },
      { source: "/en/skill-learning", headers: enPublicCacheHeaders },
      { source: "/pricing", headers: zhPricingCacheHeaders },
      { source: "/en/pricing", headers: enPricingCacheHeaders },
      { source: "/tutorials", headers: zhPublicCacheHeaders },
      { source: "/en/tutorials", headers: enPublicCacheHeaders },
      { source: "/ai-news", headers: zhPublicCacheHeaders },
      { source: "/en/ai-news", headers: enPublicCacheHeaders },
      { source: "/ai-trends", headers: zhPublicCacheHeaders },
      { source: "/en/ai-trends", headers: enPublicCacheHeaders },
      { source: "/ai-news/:slug*", headers: zhPublicCacheHeaders },
      { source: "/en/ai-news/:slug*", headers: enPublicCacheHeaders },
      { source: "/ai-topics/:slug*", headers: zhPublicCacheHeaders },
      { source: "/en/ai-topics/:slug*", headers: enPublicCacheHeaders },
      { source: "/legal/:slug*", headers: zhPublicCacheHeaders },
      { source: "/en/legal/:slug*", headers: enPublicCacheHeaders },
      { source: "/software/:slug*", headers: zhPublicCacheHeaders },
      { source: "/en/software/:slug*", headers: enPublicCacheHeaders },
      { source: "/ai-skills/:slug*", headers: zhPublicCacheHeaders },
      { source: "/en/ai-skills/:slug*", headers: enPublicCacheHeaders },
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
  },
  webpack(config, { isServer, webpack }) {
    if (!adminVisualFixtureEnabled || !isServer) return config;

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^@\/lib\/auth$/,
        path.resolve(process.cwd(), "tests/fixtures/admin-visual-auth.ts")
      ),
      new webpack.NormalModuleReplacementPlugin(
        /^@\/lib\/db$/,
        path.resolve(process.cwd(), "tests/fixtures/admin-visual-db.ts")
      )
    );
    return config;
  }
};

export default nextConfig;
