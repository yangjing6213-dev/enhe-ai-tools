import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("Search Console legacy URL redirects", () => {
  it("renders metadata in the initial HTML for every crawler", () => {
    expect(nextConfig.htmlLimitedBots).toEqual(/.*/);
  });

  it("permanently maps known legacy product, learning, and image URLs", async () => {
    const redirects = await nextConfig.redirects?.();

    expect(redirects).toEqual(
      expect.arrayContaining([
        {
          source:
            "/skill-learning/high-frequency-ai-prompts-daily-life-work-learning-teaching",
          destination:
            "/skill-learning/high-frequency-ai-prompts-for-work-learning-and-teaching",
          statusCode: 301,
        },
        {
          source:
            "/tools/mobile-chat-screenshot-maker-no-code-required-easy-to-use-ultimate-version",
          destination: "/software/no-code-chat-screenshot-maker",
          statusCode: 301,
        },
        {
          source:
            "/software/mobile-chat-screenshot-maker-no-code-required-easy-to-use-ultimate-version",
          destination: "/software/no-code-chat-screenshot-maker",
          statusCode: 301,
        },
        {
          source:
            "/tools/high-frequency-ai-prompts-daily-life-work-learning-teaching",
          destination:
            "/skill-learning/high-frequency-ai-prompts-for-work-learning-and-teaching",
          statusCode: 301,
        },
        {
          source: "/software/ai-voice-generator-flexible-edition",
          destination:
            "/software/local-ai-voice-generator-for-voiceover-materials",
          statusCode: 301,
        },
        {
          source: "/tools/ai-voice-generator-flexible-edition",
          destination:
            "/software/local-ai-voice-generator-for-voiceover-materials",
          statusCode: 301,
        },
        {
          source: "/skill-learning-3",
          destination: "/skill-learning",
          statusCode: 301,
        },
        {
          source:
            "/uploads/1780672763703-tool-product-tool-mq12l5w6-chatgpt-image-2026-6-4-22-18-45-2-.png-2",
          destination:
            "/uploads/1780672763703-tool-product-tool-mq12l5w6-chatgpt-image-2026-6-4-22-18-45-2-.png",
          statusCode: 301,
        },
        {
          source:
            "/uploads/1781369296949-tool-product-gemini-12-20-80-chatgpt-image-2026-6-13-14-15-46.png-0",
          destination:
            "/uploads/1781369296949-tool-product-gemini-12-20-80-chatgpt-image-2026-6-13-14-15-46.png",
          statusCode: 301,
        },
      ]),
    );
  });
});
