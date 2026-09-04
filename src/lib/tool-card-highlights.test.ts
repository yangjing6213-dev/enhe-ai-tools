import { describe, expect, it } from "vitest";
import { dictionaries } from "@/lib/i18n";
import { buildToolCardHighlights } from "@/lib/tool-card-highlights";

describe("tool card highlights", () => {
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
});
