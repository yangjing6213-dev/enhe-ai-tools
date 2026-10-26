import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDailyAiTipForumPost,
  selectDailyAiForumSource,
} from "@/lib/forum-daily-topic";
import {
  getDailyAiForumTopicMinute,
  getShanghaiForumClock,
  isDailyAiForumTopicDue,
} from "./forum-topic-schedule.mjs";

const transaction = vi.hoisted(() => ({
  adminAuditLog: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  user: { findFirst: vi.fn() },
  newsArticle: { findMany: vi.fn() },
  forumPost: { create: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: (callback: (client: typeof transaction) => unknown) =>
      callback(transaction),
    adminAuditLog: { findUnique: transaction.adminAuditLog.findUnique },
  },
}));

import { publishDueDailyAiTipForumTopic } from "@/lib/forum-daily-topic";
afterEach(() => vi.clearAllMocks());

describe("daily AI forum topic automation", () => {
  it("chooses a stable random-looking publishing minute during China daytime", () => {
    const first = getDailyAiForumTopicMinute("2026-10-14");
    expect(first).toBe(getDailyAiForumTopicMinute("2026-10-14"));
    expect(first).toBeGreaterThanOrEqual(9 * 60);
    expect(first).toBeLessThan(21 * 60);
    expect(getDailyAiForumTopicMinute("2026-10-15")).not.toBe(first);
    expect(getShanghaiForumClock(new Date("2026-10-14T00:30:00.000Z"))).toEqual({
      date: "2026-10-14",
      minute: 8 * 60 + 30,
    });
    expect(
      isDailyAiForumTopicDue(
        new Date(Date.UTC(2026, 9, 13, 16, first + 1)),
      ).due,
    ).toBe(true);
  });

  it("turns a published AI news item into an actionable, attributed forum discussion", () => {
    const post = buildDailyAiTipForumPost({
      title: "让 AI 代理协作处理重复工作",
      summary: "将一个大任务拆成多个步骤，并在每步检查输出。",
      sourcePath: "/ai-news/agent-workflow",
    });

    expect(post.category).toBe("workflow");
    expect(post.title).toContain("AI 代理协作处理重复工作");
    expect(post.content).toContain("把任务拆成可检查的小步骤");
    expect(post.content).toContain("/ai-news/agent-workflow");
    expect(post.content).toContain("自动整理");
  });

  it("publishes one approved, audited topic as an active admin and reuses that day's run", async () => {
    const clock = getShanghaiForumClock();
    const [year, month, day] = clock.date.split("-").map(Number);
    const lateToday = new Date(Date.UTC(year, month - 1, day, 15, 59));
    transaction.adminAuditLog.findUnique.mockResolvedValue(null);
    transaction.adminAuditLog.findMany.mockResolvedValue([]);
    transaction.user.findFirst.mockResolvedValue({ id: "admin-1" });
    transaction.newsArticle.findMany.mockResolvedValue([
      {
        id: "news-1",
        title: "让 AI 代理协作处理重复工作",
        summary: "将一个大任务拆成多个步骤，并在每步检查输出。",
        slug: "agent-workflow", publishedAt: lateToday, createdAt: lateToday, viewCount: 1,
      },
    ]);
    transaction.forumPost.create.mockResolvedValue({ id: "forum-post-1" });

    const published = await publishDueDailyAiTipForumTopic(clock.date, lateToday);
    expect(published).toEqual({ status: "published", postId: "forum-post-1" });
    expect(transaction.forumPost.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        authorId: "admin-1",
        status: "approved",
        category: "workflow",
      }),
      select: { id: true },
    });
    expect(transaction.adminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: `forum-daily-ai-topic-${clock.date}`,
        adminId: "admin-1",
        targetId: "forum-post-1",
      }),
    });

    transaction.adminAuditLog.findUnique.mockResolvedValue({ id: "already" });
    await expect(
      publishDueDailyAiTipForumTopic(clock.date, lateToday),
    ).resolves.toEqual({ status: "already_published" });
    expect(transaction.forumPost.create).toHaveBeenCalledTimes(1);
  });

  it("skips a news article already used during the full source eligibility window", async () => {
    const clock = getShanghaiForumClock();
    const [year, month, day] = clock.date.split("-").map(Number);
    const lateToday = new Date(Date.UTC(year, month - 1, day, 15, 59));
    transaction.adminAuditLog.findUnique.mockResolvedValue(null);
    transaction.adminAuditLog.findMany.mockResolvedValue([
      {
        targetId: "previous-forum-post",
        metadata: { automationDate: "2026-10-17", sourceArticleId: "news-1" },
      },
    ]);
    transaction.user.findFirst.mockResolvedValue({ id: "admin-1" });
    transaction.newsArticle.findMany.mockResolvedValue([
      { id: "news-1", title: "重复资讯", summary: "已用于旧话题。", slug: "repeat", publishedAt: lateToday, createdAt: lateToday, viewCount: 2 },
      { id: "news-2", title: "新资讯", summary: "用于新话题。", slug: "fresh", publishedAt: lateToday, createdAt: lateToday, viewCount: 1 },
    ]);
    transaction.forumPost.create.mockResolvedValue({ id: "forum-post-2" });

    const result = await publishDueDailyAiTipForumTopic(clock.date, lateToday);

    expect(result).toEqual({ status: "published", postId: "forum-post-2" });
    expect(transaction.adminAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          action: "forum.post.daily_automated",
          createdAt: {
            gte: new Date(lateToday.getTime() - 30 * 86_400_000),
          },
        }),
      }),
    );
    expect(transaction.forumPost.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "新资讯",
        content: expect.stringContaining("/ai-news/fresh"),
      }),
      select: { id: true },
    });
  });

  it.each([
    "Gmail AI Inbox向付费Workspace扩展：哪些账号还要等",
    "Amazon Bedrock + OpenCode｜把多模型编码代理纳入可审计交付",
    "Gemini技能逐步开放，Workspace版延期",
  ])("preserves each editorial angle without a generic wrapper: %s", (title) => {
    expect(buildDailyAiTipForumPost({ title, summary: "已审核的内容。", sourcePath: "/ai-news/example" }).title).toBe(title);
  });

  it("does not truncate a late eligibility restriction from a long headline", () => {
    const title = "A".repeat(78) + "：仅向部分付费账号开放";
    expect(buildDailyAiTipForumPost({ title, summary: "说明", sourcePath: "/ai-news/example" }).title).toBe(title);
  });

  it("queries undated recent articles separately so old dated results cannot crowd them out", async () => {
    const now = new Date("2026-10-26T15:59:00Z");
    transaction.adminAuditLog.findUnique.mockResolvedValue(null);
    transaction.adminAuditLog.findMany.mockResolvedValue([]);
    transaction.user.findFirst.mockResolvedValue({ id: "admin" });
    transaction.forumPost.findMany.mockResolvedValue([]);
    transaction.newsArticle.findMany.mockImplementation(({ where }) => Promise.resolve(where.publishedAt === null
      ? [{ id: "new", title: "刚整理的具体资讯", summary: "摘要", slug: "new", publishedAt: null, createdAt: now, viewCount: 1 }]
      : Array.from({ length: 100 }, (_, i) => ({ id: `old-${i}`, title: `旧稿${i}`, summary: "摘要", slug: `old-${i}`, publishedAt: new Date("2026-10-06"), createdAt: new Date("2026-10-06"), viewCount: 1000 }))));
    transaction.forumPost.create.mockResolvedValue({ id: "new-post" });
    await publishDueDailyAiTipForumTopic("2026-10-26", now);
    expect(transaction.forumPost.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ title: "刚整理的具体资讯" }) }));
  });
});

describe("content-specific recent forum source selection", () => {
  const now = new Date("2026-10-26T10:00:00Z");
  const source = (id: string, age: number, views: number, title = id) => ({
    id, title, summary: "已发布的内容", slug: id, viewCount: views,
    publishedAt: new Date(now.getTime() - age * 86400000), createdAt: now,
  });
  it("prefers recent popular news over an old high-view article", () => {
    const fresh = source("近期热门", 2, 30);
    expect(selectDailyAiForumSource([source("旧热门", 20, 5000), source("近期普通", 1, 2), fresh], new Set(), [], now)).toEqual(fresh);
  });
  it("falls back to unused older news only after recent candidates are exhausted", () => {
    const older = source("旧但未使用", 10, 20);
    expect(selectDailyAiForumSource([source("已使用", 1, 50), older], new Set(["已使用"]), [], now)).toEqual(older);
  });
  it("skips repeated headlines even when they have another article ID or legacy wrapper", () => {
    const remaining = source("未重复", 2, 1);
    expect(selectDailyAiForumSource([source("another-id", 1, 100, "Gmail AI Inbox开放"), remaining], new Set(), ["把「Gmail AI Inbox 开放」变成可复用 AI 工作流"], now)).toEqual(remaining);
  });
  it("rejects future, stale, empty and overlong sources instead of inventing or cutting facts", () => {
    const candidates = [source("future", -1, 1), source("old", 31, 1), source("empty", 1, 1, " "), source("long", 1, 1, "中".repeat(121))];
    expect(selectDailyAiForumSource(candidates, new Set(), [], now)).toBeUndefined();
  });
});
