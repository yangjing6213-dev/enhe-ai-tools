import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDailyAiTipForumPost,
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
  forumPost: { create: vi.fn() },
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
        slug: "agent-workflow",
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

  it("skips a news article already used by an earlier daily forum topic", async () => {
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
      { id: "news-1", title: "重复资讯", summary: "已用于旧话题。", slug: "repeat" },
      { id: "news-2", title: "新资讯", summary: "用于新话题。", slug: "fresh" },
    ]);
    transaction.forumPost.create.mockResolvedValue({ id: "forum-post-2" });

    const result = await publishDueDailyAiTipForumTopic(clock.date, lateToday);

    expect(result).toEqual({ status: "published", postId: "forum-post-2" });
    expect(transaction.forumPost.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "把「新资讯」变成可复用 AI 工作流",
        content: expect.stringContaining("/ai-news/fresh"),
      }),
      select: { id: true },
    });
  });
});
