import { describe, expect, it } from "vitest";
import { buildAiNewsSerpTitle } from "@/lib/ai-news";
import { buildMetadataTitle, buildToolMetadataTitle } from "@/lib/seo";

describe("CTR title formatting", () => {
  it("drops an account-service type segment when it cannot fit cleanly", () => {
    const title = buildToolMetadataTitle({
      name: "Gmail and Google Ecosystem Account Guidance - AI Account Service",
      englishName: null,
      brand: "ENHE AI",
      locale: "en",
    });

    expect(title).toBe(
      "Gmail and Google Ecosystem Account Guidance | ENHE AI",
    );
    expect(title).not.toContain("| |");
  });

  it("removes dangling punctuation before the brand suffix", () => {
    const title = buildToolMetadataTitle({
      name: "High-Frequency AI Prompts for Work, Learning, and Teaching - AI Skill Course",
      englishName: null,
      brand: "ENHE AI",
      locale: "en",
    });

    expect(title).not.toContain(", | ENHE AI");
    expect(title).not.toContain("| |");
    expect(title).toMatch(/\| ENHE AI$/);
    expect(title.length).toBeLessThanOrEqual(58);
  });

  it("keeps English AI news titles on complete words after both truncation steps", () => {
    const pageTitle = buildAiNewsSerpTitle({
      title:
        "How ENHE AI Helps Users Understand Copilot Security Review and Code Security Governance",
      categoryName: "AI News",
      locale: "en",
      maxLength: 58,
    });
    const title = buildMetadataTitle({
      pageTitle,
      brand: "ENHE AI",
      maxLength: 58,
    });

    expect(title).toBe(
      "Copilot Security Review and Code Security | ENHE AI",
    );
    expect(title).not.toMatch(/\bSecuri\b/);
  });
});
