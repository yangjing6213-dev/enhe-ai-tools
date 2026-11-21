import { describe, expect, it } from "vitest";
import { dictionaries } from "@/lib/i18n";
import { buildToolCardHighlights, buildValueSentence } from "@/lib/tool-card-highlights";

describe("tool card highlights", () => {
  it("keeps a complete English value sentence instead of splitting at a comma", () => {
    expect(
      buildValueSentence(
        "Practice AI image, writing, video, and traffic workflows through project-based lessons that clarify the path from tool use to execution.",
        "en",
      ),
    ).toBe(
      "Practice AI image, writing, video, and traffic workflows through project-based lessons that clarify the path from tool use to execution.",
    );
  });

  it("deduplicates repeated paid-download highlights while preserving order", () => {
    const highlights = buildToolCardHighlights(
      {
        type: "software",
        isDownloadPaid: true,
        downloadPrice: 99,
        priceSpecs: []
      },
      "zh"
    );

    expect(highlights).toEqual([dictionaries.zh.toolCard.capabilitySoftware, dictionaries.zh.toolCard.capabilityPaidDownload]);
  });

  it("keeps three distinct highlights for free online tools", () => {
    const highlights = buildToolCardHighlights(
      {
        type: "online",
        isDownloadPaid: false,
        downloadPrice: null,
        priceSpecs: []
      },
      "en"
    );

    expect(highlights).toEqual([
      dictionaries.en.toolCard.capabilityOnline,
      dictionaries.en.toolCard.capabilityFree,
      dictionaries.en.toolCard.capabilityAccess
    ]);
  });

  it("marks skill courses as paid only when an active positive price exists", () => {
    expect(
      buildToolCardHighlights(
        {
          type: "skill_learning",
          downloadPrice: 99,
          priceSpecs: [{ price: 99, status: "disabled" }]
        },
        "zh"
      )
    ).toEqual([
      dictionaries.zh.toolCard.capabilityCourse,
      dictionaries.zh.toolCard.capabilityFree,
      dictionaries.zh.toolCard.capabilityAccess
    ]);

    expect(
      buildToolCardHighlights(
        {
          type: "skill_learning",
          downloadPrice: 0,
          priceSpecs: [{ price: 19, status: "active" }]
        },
        "zh"
      )
    ).toEqual([dictionaries.zh.toolCard.capabilityCourse, dictionaries.zh.toolCard.capabilityPaidCourse]);
  });
});
