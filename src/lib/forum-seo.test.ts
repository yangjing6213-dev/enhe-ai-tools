import type { Metadata } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { forumPost: { findFirst } } }));
vi.mock("@/components/public-site-chrome", () => ({ PublicSiteChrome: vi.fn() }));
vi.mock("@/components/forum/forum-ui", () => ({}));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/forum-data", () => ({}));

describe("forum route metadata", () => {
  beforeEach(() => {
    findFirst.mockReset();
    vi.stubEnv("APP_URL", "https://www.enhe-tech.com.cn");
    vi.stubEnv("DATABASE_URL", "postgresql://unused-for-mocked-test");
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    { path: "@/app/(zh-public)/forum/page", locale: "zh", canonical: "/forum", title: "共创AI论坛" },
    { path: "@/app/en/forum/page", locale: "en", canonical: "/en/forum", title: "AI Community Forum" },
  ])("gives the $locale forum its own metadata and canonical without category parameters", async ({ path, canonical, title }) => {
    const route = await import(path);
    const metadata: Metadata = await route.generateMetadata({ searchParams: Promise.resolve({ category: "workflow" }) });
    expect(metadata.title).toContain(title);
    expect(metadata.description?.length).toBeGreaterThan(30);
    expect(metadata.alternates?.canonical).toBe(`https://www.enhe-tech.com.cn${canonical}`);
    expect(metadata.alternates?.languages).toEqual({
      "x-default": "https://www.enhe-tech.com.cn/forum",
      "zh-CN": "https://www.enhe-tech.com.cn/forum",
      "en-US": "https://www.enhe-tech.com.cn/en/forum",
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it.each([
    { path: "@/app/(zh-public)/forum/[postId]/page", locale: "zh", index: true },
    { path: "@/app/en/forum/[postId]/page", locale: "en", index: false },
  ])("uses approved post content and Chinese canonical for the $locale detail route", async ({ path, index }) => {
    findFirst.mockResolvedValue({ title: "AI 工作流实践", content: "我们用 AI 整理文档，\n  分享流程与使用经验。" });
    const route = await import(path);
    const metadata: Metadata = await route.generateMetadata({ params: Promise.resolve({ postId: "public-post" }) });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "public-post", status: "approved" },
      select: { title: true, content: true },
    });
    expect(metadata.title).toContain("AI 工作流实践");
    expect(metadata.description).toBe("我们用 AI 整理文档， 分享流程与使用经验。");
    expect(metadata.alternates?.canonical).toBe("https://www.enhe-tech.com.cn/forum/public-post");
    expect(metadata.alternates?.languages).not.toHaveProperty("en-US");
    expect(metadata.openGraph).toMatchObject({ locale: "zh_CN", url: "https://www.enhe-tech.com.cn/forum/public-post" });
    expect(metadata.robots).toEqual({ index, follow: true });
  });

  it("does not expose or index an unavailable post", async () => {
    findFirst.mockResolvedValue(null);
    const { generateMetadata } = await import("@/app/(zh-public)/forum/[postId]/page");
    const metadata = await generateMetadata({ params: Promise.resolve({ postId: "private-post" }) });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.title).toContain("话题暂不可用");
  });

  it("does not query a database or claim a public post exists in a database-free preview", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { generateMetadata } = await import("@/app/en/forum/[postId]/page");
    const metadata = await generateMetadata({ params: Promise.resolve({ postId: "unverified-post" }) });
    expect(findFirst).not.toHaveBeenCalled();
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.title).toContain("Discussion unavailable");
  });

  it.each(["@/app/(zh-public)/forum/new/page", "@/app/en/forum/new/page"])("keeps the authoring route out of search: %s", async (path) => {
    const route = await import(path);
    const metadata: Metadata = await route.generateMetadata();
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
