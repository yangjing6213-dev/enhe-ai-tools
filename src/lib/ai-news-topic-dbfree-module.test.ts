import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("AI News topic DB-free module boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/db");
    vi.doUnmock("@/lib/public-content");
  });

  it("does not load public content or Prisma while importing the topic module", async () => {
    const prismaModuleLoad = vi.fn();
    const publicContentModuleLoad = vi.fn();

    vi.doMock("@/lib/db", () => {
      prismaModuleLoad();
      return { prisma: {} };
    });
    vi.doMock("@/lib/public-content", () => {
      publicContentModuleLoad();
      return {
        getPublicAiNewsTopic: vi.fn(),
        getPublicAiNewsTopicSlugs: vi.fn(),
        getPublicNewsListing: vi.fn(),
      };
    });

    await import("@/app/ai-news/topics/[slug]/page-shell");

    expect(publicContentModuleLoad).not.toHaveBeenCalled();
    expect(prismaModuleLoad).not.toHaveBeenCalled();
  });
});
