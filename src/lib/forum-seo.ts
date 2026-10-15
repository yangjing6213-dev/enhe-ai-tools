import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import type { Locale } from "@/lib/dictionaries";
import { buildAvailableLanguageAlternates, buildMetadataTitle, buildPageMetadata } from "@/lib/seo";

export function generateForumIndexMetadata(locale: Locale): Metadata {
  return buildPageMetadata({
    title: buildMetadataTitle({ pageTitle: locale === "en" ? "AI Community Forum" : "共创AI论坛" }),
    description: locale === "en"
      ? "Ask questions, share practical AI workflows, and exchange experience with the ENHE AI community. Browse discussions about AI tools, content creation, and everyday use."
      : "在 ENHE AI 共创AI论坛提问、交流工具使用经验，分享实用工作流和创作成果。从日常办公到内容创作，与社区成员一起讨论 AI 的实际用法。",
    path: "/forum",
    localeKey: locale,
    locale: locale === "en" ? "en_US" : "zh_CN",
  });
}

export async function generateForumPostMetadata(locale: Locale, postId: string): Promise<Metadata> {
  const post = process.env.DATABASE_URL?.trim()
    ? await prisma.forumPost.findFirst({
      where: { id: postId, status: "approved" },
      select: { title: true, content: true },
    })
    : null;
  const path = `/forum/${encodeURIComponent(postId)}`;

  if (!post) {
    return {
      title: locale === "en" ? "Discussion unavailable | ENHE AI" : "话题暂不可用 | ENHE AI",
      robots: { index: false, follow: true },
    };
  }

  // Both routes show the same original post; the English shell is not a translation.
  return {
    ...buildPageMetadata({
      title: buildMetadataTitle({ pageTitle: post.title }),
      description: post.content,
      path,
      localeKey: "zh",
      locale: "zh_CN",
      languageAlternates: buildAvailableLanguageAlternates(path, ["zh"]),
    }),
    robots: { index: locale === "zh", follow: true },
  };
}

export function generateForumNewPostMetadata(locale: Locale): Metadata {
  return {
    ...buildPageMetadata({
      title: buildMetadataTitle({ pageTitle: locale === "en" ? "Start a discussion" : "发布新话题" }),
      description: locale === "en" ? "Start a discussion in the ENHE AI community forum." : "在 ENHE AI 共创AI论坛发布新话题，提问或分享使用经验。",
      path: "/forum/new",
      localeKey: locale,
      locale: locale === "en" ? "en_US" : "zh_CN",
      languageAlternates: {},
    }),
    robots: { index: false, follow: true },
  };
}
