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
const answerEngineUserAgents = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "ClaudeBot",
  "anthropic-ai",
  "Googlebot",
  "GoogleOther",
  "Google-Extended",
  "Bingbot",
  "Applebot",
  "Baiduspider",
  "Bytespider",
  "Doubaobot",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...answerEngineUserAgents.map((userAgent) => ({
        userAgent,
        allow: ["/"],
        disallow: privateDisallow,
      })),
      {
        userAgent: "*",
        allow: ["/", "/api/uploads/"],
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
