import { afterEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("AI news translation isolation in the admin visual fixture", () => {
  it("rejects before calling the external translation service", async () => {
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "1");
    vi.stubEnv("OPENAI_API_KEY", "test-only-key");
    vi.stubEnv("OPENAI_BASE_URL", "https://example.invalid/v1");
    vi.stubEnv("OPENAI_MODEL", "test-only-model");
    fetchMock.mockReset();

    const { generateAiNewsEnglishDraft } = await import("@/lib/ai-news-translation");

    await expect(
      generateAiNewsEnglishDraft({
        title: "中文标题",
        summary: "中文摘要",
        content: "正文"
      })
    ).rejects.toThrow("AI news translation is disabled in the admin visual fixture.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
