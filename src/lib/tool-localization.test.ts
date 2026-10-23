import { describe, expect, it } from "vitest";
import {
  buildLocalizedToolFaqItems,
  buildLocalizedToolLongContent,
  buildLocalizedToolOfferName,
  buildLocalizedToolSummary,
  buildLocalizedToolTutorialItems,
  resolveLocalizedToolIdentity,
  resolveLocalizedToolTagName,
  shouldIndexEnglishToolPage,
} from "@/lib/tool-localization";

const copyCleanerName = "ENHE \u6587\u6848\u6e05\u6d17\u5728\u7ebf\u5de5\u5177";
const copyCleanerSummary =
  "\u6e05\u7406\u591a\u4f59\u7a7a\u683c\u3001\u6362\u884c\u548c\u7279\u6b8a\u7b26\u53f7\uff0c\u9002\u5408\u5185\u5bb9\u6574\u7406\u3002";
const copyCleanerContent =
  "\u9002\u5408\u6574\u7406\u6587\u6863\u3001\u94fe\u63a5\u3001\u6807\u9898\u4e0e\u793e\u4ea4\u5a92\u4f53\u5185\u5bb9\uff0c\u8ba9\u9875\u9762\u5185\u5bb9\u66f4\u6574\u6d01\u3002";

describe("tool localization helpers", () => {
  it("prefers english names on english pages and falls back to descriptive slugs", () => {
    expect(
      resolveLocalizedToolIdentity(
        {
          slug: "enhe-copy-cleaner",
          name: copyCleanerName,
          englishName: "ENHE Copy Cleaner",
          type: "online",
        },
        "en",
      ),
    ).toEqual({
      primaryName: "ENHE Copy Cleaner",
      secondaryName: copyCleanerName,
    });

    expect(
      resolveLocalizedToolIdentity(
        {
          slug: "enhe-copy-cleaner",
          name: copyCleanerName,
          englishName: null,
          type: "online",
        },
        "en",
      ),
    ).toEqual({
      primaryName: "ENHE Copy Cleaner",
      secondaryName: copyCleanerName,
    });
  });

  it("falls back to type labels when english pages only have generated ids", () => {
    expect(
      resolveLocalizedToolIdentity(
        {
          slug: "tool-cmptpgzow0007toe0ld9yuc0w",
          name: "\u6d4b\u8bd5",
          englishName: null,
          type: "software",
        },
        "en",
      ),
    ).toEqual({
      primaryName: "AI Software App",
      secondaryName: "\u6d4b\u8bd5",
    });
  });

  it("does not expose Chinese-only summaries as English copy", () => {
    const summary = buildLocalizedToolSummary(
      {
        slug: "enhe-copy-cleaner",
        name: copyCleanerName,
        englishName: null,
        shortDescription: copyCleanerSummary,
        type: "online",
        categoryName: "Online Processing",
      },
      "en",
    );

    expect(summary).toContain("AI account service");
    expect(summary).not.toContain(copyCleanerSummary);
  });

  it("does not expose mixed Chinese source descriptions as English copy", () => {
    const mixedSummary = `${copyCleanerSummary} ENHE Copy Cleaner helps prepare copy before publishing.`;
    const summary = buildLocalizedToolSummary(
      {
        slug: "enhe-copy-cleaner",
        name: copyCleanerName,
        englishName: "ENHE Copy Cleaner",
        shortDescription: mixedSummary,
        type: "software",
        categoryName: "AI Software App",
      },
      "en",
    );

    expect(summary).toContain("Review pricing, version details");
    expect(summary).not.toContain(copyCleanerSummary);
  });

  it("uses fallback English descriptions for display but not for indexing", () => {
    const summary = buildLocalizedToolSummary(
      {
        slug: "ai-ai",
        name: "Raw local name",
        englishName: "AI Voice Generator - Flexible Edition",
        shortDescription: "draft",
        type: "software",
        categoryName: "AI Software App",
      },
      "en",
    );

    expect(summary).toContain(
      "AI Voice Generator - Flexible Edition is an AI software app",
    );
  });

  it("does not expose Chinese-only detail copy on English pages", () => {
    const content = buildLocalizedToolLongContent(
      {
        slug: "enhe-copy-cleaner",
        name: copyCleanerName,
        englishName: null,
        shortDescription: copyCleanerSummary,
        content: copyCleanerContent,
        type: "online",
        categoryName: "Online Processing",
      },
      "en",
    );

    expect(content).toContain("support guidance");
    expect(content).not.toContain(copyCleanerContent);
  });

  it("selects English summary and content blocks for English tool pages", () => {
    const shortDescription =
      "[[zh]]\u4e2d\u6587\u5de5\u5177\u6458\u8981\u3002[[/zh]][[en]]Create polished images faster with a focused AI workflow.[[/en]]";
    const content =
      "[[zh]]\u4e2d\u6587\u5de5\u5177\u8be6\u60c5\u3002[[/zh]][[en]]Use the guided workspace to create, review, refine, and export production-ready images for everyday creative projects.[[/en]]";
    const tool = {
      slug: "bilingual-image-studio",
      name: "\u53cc\u8bed AI \u56fe\u7247\u5de5\u5177",
      englishName: "Bilingual AI Image Studio",
      shortDescription,
      content,
      type: "software" as const,
    };

    expect(buildLocalizedToolSummary(tool, "en")).toBe(
      "Create polished images faster with a focused AI workflow.",
    );
    expect(buildLocalizedToolLongContent(tool, "en")).toBe(
      "Use the guided workspace to create, review, refine, and export production-ready images for everyday creative projects.",
    );
    expect(buildLocalizedToolSummary(tool, "zh")).toBe("\u4e2d\u6587\u5de5\u5177\u6458\u8981\u3002");
    expect(buildLocalizedToolLongContent(tool, "zh")).toBe("\u4e2d\u6587\u5de5\u5177\u8be6\u60c5\u3002");
    expect(shouldIndexEnglishToolPage(tool)).toBe(true);
  });

  it("marks english detail pages without genuine english source copy as non-indexable", () => {
    expect(
      shouldIndexEnglishToolPage({
        slug: "enhe-copy-cleaner",
        name: copyCleanerName,
        englishName: null,
        shortDescription: copyCleanerSummary,
        content: copyCleanerContent,
        type: "online",
      }),
    ).toBe(false);

    expect(
      shouldIndexEnglishToolPage({
        slug: "enhe-copy-cleaner",
        name: copyCleanerName,
        englishName: "ENHE Copy Cleaner",
        shortDescription:
          "Clean extra spaces, line breaks, and special characters for faster content editing.",
        content:
          "Use this tool to clean copy, links, headlines, and social snippets before publishing.",
        type: "online",
      }),
    ).toBe(true);
  });

  it("keeps SearchScope non-indexable while its English copy is being reviewed", () => {
    expect(
      shouldIndexEnglishToolPage({
        slug: "searchscope-seo-geo",
        name: "SearchScope SEO/GEO",
        englishName: "SearchScope SEO/GEO",
        shortDescription:
          "Review basic SEO and GEO signals on publicly accessible websites.",
        content:
          "Inspect public page titles, content structure, multilingual relations, structured data, and crawler rules. Review evidence, priorities, and suggested next steps before applying changes.",
        type: "software",
      }),
    ).toBe(false);
  });

  it("does not index English details when only generated English copy would exist", () => {
    expect(
      shouldIndexEnglishToolPage({
        slug: "ai-ai",
        name: "\u0041\u0049\u8bed\u97f3\u751f\u6210",
        englishName: "AI Voice Generator - Flexible Edition",
        shortDescription:
          "\u672c\u5730\u79bb\u7ebf AI \u8bed\u97f3\u5408\u6210\u684c\u9762\u5de5\u5177\u3002",
        content:
          "\u9002\u5408\u5728\u672c\u5730\u7535\u8111\u4e0a\u5b8c\u6210\u8bed\u97f3\u751f\u6210\u548c\u97f3\u9891\u7d20\u6750\u6574\u7406\u3002",
        type: "software",
      }),
    ).toBe(false);
  });

  it("localizes english detail tags and offer names without exposing risky account labels", () => {
    expect(resolveLocalizedToolTagName("Creator Kit", "en")).toBe(
      "Creator Kit",
    );
    expect(
      buildLocalizedToolOfferName("\u57fa\u7840\u5957\u9910", "online", "en", 0),
    ).toBe("Service option 1");
    expect(buildLocalizedToolOfferName("Pro access", "software", "en", 1)).toBe(
      "Pro access",
    );
    expect(
      buildLocalizedToolOfferName("\u57fa\u7840\u5957\u9910", "online", "zh", 0),
    ).toBe("\u57fa\u7840\u5957\u9910");
  });

  it("switches English page FAQs and tutorials to English content", () => {
    const tool = {
      slug: "enhe-copy-cleaner",
      name: copyCleanerName,
      englishName: null,
      shortDescription: copyCleanerSummary,
      content: copyCleanerContent,
      type: "online" as const,
      categoryName: "Online Processing",
    };

    const faqs = buildLocalizedToolFaqItems(
      [
        {
          id: "faq-1",
          question:
            "[[zh]]\u600e\u4e48\u4f7f\u7528\uff1f[[/zh]][[en]]How do I use it?[[/en]]",
          answer:
            "[[zh]]\u767b\u5f55\u540e\u5373\u53ef\u67e5\u770b\u4f7f\u7528\u65b9\u5f0f\u3002[[/zh]][[en]]Sign in to view access notes and usage steps.[[/en]]",
        },
      ],
      tool,
      "en",
    );

    expect(faqs).toHaveLength(5);
    expect(faqs[0].question).toBe("How do I use it?");
    expect(faqs[0].answer).toContain("Sign in to view access notes");

    const tutorials = buildLocalizedToolTutorialItems(
      [
        {
          id: "tutorial-1",
          title:
            "[[zh]]\u4f7f\u7528\u6b65\u9aa4[[/zh]][[en]]Access guide[[/en]]",
          content:
            "[[zh]]\u590d\u5236\u6587\u672c\u540e\u70b9\u51fb\u5904\u7406\u3002[[/zh]][[en]]Copy text, review the settings, and click the process button.[[/en]]",
          notes: null,
          commonErrors: null,
          videoUrl: null,
        },
      ],
      tool,
      "en",
    );

    expect(tutorials).toHaveLength(1);
    expect(tutorials[0].title).toBe("Access guide");
    expect(tutorials[0].content).toContain("Copy text");
  });

  it("uses English FAQ and tutorial fallbacks when records only have Chinese copy", () => {
    const tool = {
      slug: "enhe-copy-cleaner",
      name: copyCleanerName,
      englishName: null,
      shortDescription: copyCleanerSummary,
      content: copyCleanerContent,
      type: "online" as const,
      categoryName: "Online Processing",
    };

    const faqs = buildLocalizedToolFaqItems(
      [
        {
          id: "faq-1",
          question: "\u600e\u4e48\u4f7f\u7528\uff1f",
          answer:
            "\u767b\u5f55\u540e\u5373\u53ef\u67e5\u770b\u4f7f\u7528\u65b9\u5f0f\u3002",
        },
      ],
      tool,
      "en",
    );
    const tutorials = buildLocalizedToolTutorialItems(
      [
        {
          id: "tutorial-1",
          title: "\u4f7f\u7528\u6b65\u9aa4",
          content:
            "\u590d\u5236\u6587\u672c\u540e\u70b9\u51fb\u5904\u7406\u3002",
          notes: null,
          commonErrors: null,
          videoUrl: null,
        },
      ],
      tool,
      "en",
    );

    expect(faqs[0].question).toBe("What is this AI account service for?");
    expect(faqs[0].answer).toContain("AI account service");
    expect(faqs[0].answer).toContain("access support");
    expect(tutorials[0].title).toBe("Access and usage guide");
    expect(tutorials[0].content).toContain("Review pricing, delivery notes");
  });

  it("provides five Chinese fallback FAQs for software apps and skill courses", () => {
    const softwareFaqs = buildLocalizedToolFaqItems(
      [],
      {
        slug: "ai-video-studio",
        name: "AI Video Studio",
        englishName: "AI Video Studio",
        shortDescription: "\u672c\u5730 AI \u89c6\u9891\u751f\u6210\u5de5\u5177\u3002",
        content: "",
        type: "software",
        categoryName: "AI \u89c6\u9891\u5de5\u5177",
      },
      "zh",
    );
    const courseFaqs = buildLocalizedToolFaqItems(
      [],
      {
        slug: "prompt-engineering-course",
        name: "AI \u63d0\u793a\u8bcd\u5b9e\u6218\u8bfe",
        englishName: "Prompt Engineering Course",
        shortDescription:
          "\u5b66\u4e60\u63d0\u793a\u8bcd\u548c AI \u5de5\u5177\u5b9e\u6218\u65b9\u6cd5\u3002",
        content: "",
        type: "skill_learning",
        categoryName: "AI \u6280\u80fd\u6559\u7a0b",
      },
      "zh",
    );

    expect(softwareFaqs).toHaveLength(5);
    expect(courseFaqs).toHaveLength(5);
    expect(softwareFaqs.map((item) => item.question).join(" ")).toContain(
      "AI Video Studio",
    );
    expect(courseFaqs.map((item) => item.question).join(" ")).toContain(
      "AI \u63d0\u793a\u8bcd\u5b9e\u6218\u8bfe",
    );
  });
});
