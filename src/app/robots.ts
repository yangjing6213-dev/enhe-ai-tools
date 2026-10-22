import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

const privateDisallow = [
  "/admin",
  "/dashboard",
  "/user-center",
  "/checkout",
  "/orders",
  "/payment",
  "/api",
];

const publicAllow = [
  "/",
  "/about",
  "/llms.txt",
  "/ai-news",
  "/ai-trends",
  "/software",
  "/account-services",
  "/skill-learning",
  "/product-paths",
  "/product-demos",
  "/api/uploads/",
  "/api/tool-images$",
  "/api/tool-images?",
  "/api/ai-workflows/covers/",
];

const answerEngineUserAgents = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "Googlebot",
  "GoogleOther",
  "Google-Extended",
  "Bingbot",
  "Applebot",
  "Applebot-Extended",
  "Baiduspider",
  "Bytespider",
  "Doubaobot",
  "KimiBot",
  "MoonshotBot",
  "DeepSeekBot",
  "BingPreview",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...answerEngineUserAgents.map((userAgent) => ({
        userAgent,
        allow: publicAllow,
        disallow: privateDisallow,
      })),
      {
        userAgent: "*",
        allow: publicAllow,
        disallow: [
          "/admin",
          "/dashboard",
          "/user-center",
          "/checkout",
          "/orders",
          "/payment",
          "/api",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
