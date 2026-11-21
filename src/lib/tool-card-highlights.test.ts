import { describe, expect, it } from "vitest";
import { dictionaries } from "@/lib/i18n";
import { buildToolCardHighlights, buildValueSentence, classifyCourseFormat } from "@/lib/tool-card-highlights";

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

  it("describes only the media present in active course lessons", () => {
    const lesson = { content: "Follow the instructions.", imageUrl: null, videoUrl: null };
    expect(classifyCourseFormat([])).toBe("unknown");
    expect(classifyCourseFormat([{ ...lesson, content: "  " }])).toBe("unknown");
    expect(classifyCourseFormat([lesson])).toBe("written");
    expect(classifyCourseFormat([{ ...lesson, imageUrl: "/example.webp" }])).toBe("illustrated");
    expect(classifyCourseFormat([lesson, { ...lesson, videoUrl: "/lesson.mp4" }])).toBe("video");
    expect(buildToolCardHighlights({ type: "skill_learning", courseFormat: "written" }, "zh")[0]).toBe("文字教程");
    expect(buildToolCardHighlights({ type: "skill_learning", courseFormat: "video" }, "en")[0]).toBe("Video Course");
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
      "课程形式待确认",
      dictionaries.zh.toolCard.free
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
    ).toEqual(["课程形式待确认", dictionaries.zh.toolCard.capabilityPaidCourse]);
  });
});
