import { buildCanonicalAiNewsPath } from "@/lib/public-slugs";
import { prisma } from "@/lib/db";
import {
  getDailyAiForumTopicMinute,
  getShanghaiForumClock,
} from "@/lib/forum-topic-schedule.mjs";

const AUTOMATION_ACTION = "forum.post.daily_automated";
const AUDIT_PREFIX = "forum-daily-ai-topic-";
const SOURCE_LOOKBACK_DAYS = 30;
const REPEAT_LOOKBACK_DAYS = SOURCE_LOOKBACK_DAYS;
const SOURCE_SELECT = {
  id: true, title: true, slug: true, summary: true,
  publishedAt: true, createdAt: true, viewCount: true,
} as const;

type AiNewsTopicSource = {
  id: string;
  title: string;
  summary: string;
  slug: string;
  publishedAt: Date | null;
  createdAt: Date;
  viewCount: number;
};

function headlineKey(title: string) {
  return title.replace(/^把「([\s\S]*)」变成可复用\s*AI\s*工作流$/, "$1")
    .normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

export function selectDailyAiForumSource(
  sources: AiNewsTopicSource[],
  recentlyUsed: Set<string>,
  recentTitles: string[],
  now: Date,
) {
  const usedTitles = new Set(recentTitles.map(headlineKey));
  const ageDays = (source: AiNewsTopicSource) =>
    (now.getTime() - (source.publishedAt ?? source.createdAt).getTime()) / 86_400_000;
  return sources.filter((source) => {
    const title = source.title.replace(/\s+/g, " ").trim();
    const age = ageDays(source);
    return title.length >= 2 && title.length <= 120 && source.summary.trim() &&
      age >= 0 && age <= SOURCE_LOOKBACK_DAYS &&
      !recentlyUsed.has(source.id) && !usedTitles.has(headlineKey(title));
  }).sort((a, b) => {
    // Recent editorial coverage first; views are site interest, not global trends.
    const recentFirst = Number(ageDays(b) <= 7) - Number(ageDays(a) <= 7);
    return recentFirst || b.viewCount - a.viewCount || ageDays(a) - ageDays(b) || a.id.localeCompare(b.id);
  })[0];
}

export function buildDailyAiTipForumPost(source: {
  title: string;
  summary: string;
  sourcePath: string;
}) {
  // Reuse the reviewed, content-specific headline without inventing a claim or
  // cutting off eligibility restrictions to make room for a generic wrapper.
  const topic = source.title.replace(/\s+/g, " ").trim();
  const summary = source.summary.replace(/\s+/g, " ").trim().slice(0, 220);
  const sourcePath = source.sourcePath.startsWith("/ai-news/")
    ? source.sourcePath
    : "/ai-news";

  return {
    category: "workflow" as const,
    title: topic,
    content: [
      summary,
      "不必只停留在了解新功能，可以从一个重复的小任务开始练习：",
      "1. 把目标、背景资料、限制条件和期望格式一次说清楚。",
      "2. 把任务拆成可检查的小步骤，让 AI 每完成一步先给你确认。",
      "3. 用真实样例检查结果，再把好用的提示词保存下来，下次继续复用。",
      "可以直接试试：请先复述我的目标；如果关键信息不足，先提问。然后把任务拆成可检查的步骤，按我给定的格式输出，并在最后列出需要我核实的内容。",
      `相关阅读：${sourcePath}`,
      "本话题由 ENHE AI 根据站内已发布资讯自动整理；具体功能和信息请以原文为准。",
      "你会先把这个方法用在哪个任务上？欢迎分享你的做法。",
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

function auditId(localDate: string) {
  return `${AUDIT_PREFIX}${localDate}`;
}

function isUniqueConflict(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002",
  );
}

function readSourceArticleId(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const sourceArticleId = (metadata as Record<string, unknown>).sourceArticleId;
  return typeof sourceArticleId === "string" ? sourceArticleId : null;
}

export async function publishDueDailyAiTipForumTopic(
  localDate: string,
  now = new Date(),
) {
  const clock = getShanghaiForumClock(now);
  if (clock.date !== localDate) throw new Error("INVALID_FORUM_TOPIC_DATE");

  const scheduledMinute = getDailyAiForumTopicMinute(localDate);
  if (clock.minute < scheduledMinute) return { status: "not_due" as const };

  const since = new Date(now.getTime() - SOURCE_LOOKBACK_DAYS * 86_400_000);
  const repeatSince = new Date(
    now.getTime() - REPEAT_LOOKBACK_DAYS * 86_400_000,
  );

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.adminAuditLog.findUnique({
        where: { id: auditId(localDate) },
        select: { id: true },
      });
      if (existing) return { status: "already_published" as const };

      const admin = await tx.user.findFirst({
        where: { role: "admin", status: "active" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true },
      });
      if (!admin) return { status: "no_admin" as const };

      const [recentTopics, datedSources, undatedSources, recentPosts] = await Promise.all([
        tx.adminAuditLog.findMany({
          where: {
            action: AUTOMATION_ACTION,
            createdAt: { gte: repeatSince },
          },
          select: { metadata: true },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
        tx.newsArticle.findMany({
          where: {
            status: "published",
            publishedAt: { gte: since, lte: now },
          },
          select: SOURCE_SELECT,
          orderBy: [
            { publishedAt: { sort: "desc", nulls: "last" } },
            { createdAt: "desc" },
            { id: "asc" },
          ],
          take: 100,
        }),
        tx.newsArticle.findMany({
          where: { status: "published", publishedAt: null, createdAt: { gte: since, lte: now } },
          select: SOURCE_SELECT,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: 100,
        }),
        tx.forumPost.findMany({
          where: { status: "approved", createdAt: { gte: repeatSince } },
          select: { title: true },
          orderBy: { createdAt: "desc" },
          take: 500,
        }),
      ]);
      const recentlyUsed = new Set(
        recentTopics
          .map((topic) => readSourceArticleId(topic.metadata))
          .filter((sourceArticleId): sourceArticleId is string => Boolean(sourceArticleId)),
      );
      const source = selectDailyAiForumSource([...datedSources, ...undatedSources], recentlyUsed, recentPosts.map((post) => post.title), now);
      if (!source) return { status: "no_source" as const };

      const sourcePath = buildCanonicalAiNewsPath(source, "zh");
      const post = buildDailyAiTipForumPost({
        title: source.title,
        summary: source.summary,
        sourcePath,
      });
      const createdPost = await tx.forumPost.create({
        data: {
          authorId: admin.id,
          category: post.category,
          title: post.title,
          content: post.content,
          status: "approved",
        },
        select: { id: true },
      });
      await tx.adminAuditLog.create({
        data: {
          id: auditId(localDate),
          adminId: admin.id,
          action: AUTOMATION_ACTION,
          targetType: "forum_post",
          targetId: createdPost.id,
          summary: "Published the daily AI tips forum topic from approved ENHE AI news.",
          metadata: {
            automationDate: localDate,
            sourceArticleId: source.id,
            sourcePath,
            scheduledMinute,
            headlineStrategy: "reviewed_content_headline",
            sourcePublishedAt: (source.publishedAt ?? source.createdAt).toISOString(),
          },
        },
      });
      return { status: "published" as const, postId: createdPost.id };
    });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const existing = await prisma.adminAuditLog.findUnique({
      where: { id: auditId(localDate) },
      select: { id: true },
    });
    if (existing) return { status: "already_published" as const };
    throw error;
  }
}
