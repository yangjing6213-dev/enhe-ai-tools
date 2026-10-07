import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("AI News detail DB-free module boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/db");
  });

  it("does not load the Prisma module while building unavailable metadata", async () => {
    const prismaModuleLoad = vi.fn(() => {
      throw new Error("Prisma module must not load in DB-free metadata");
    });
    vi.doMock("@/lib/db", () => {
      prismaModuleLoad();
      return {};
    });

    const { generateAiNewsDetailPageMetadata } = await import(
      "@/app/ai-news/[slug]/page-shell"
    );
    const metadata = await generateAiNewsDetailPageMetadata(
      "zh",
      "db-free-probe",
    );
    const englishMetadata = await generateAiNewsDetailPageMetadata(
      "en",
      "db-free-probe",
    );

    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.description).toBe(
      "待核验：本地预览不提供 AI 资讯详情内容。",
    );
    expect(englishMetadata.description).toBe(
      "UNVERIFIED - AI News detail content is not available in this local preview.",
    );
    expect(prismaModuleLoad).not.toHaveBeenCalled();
  });
});
