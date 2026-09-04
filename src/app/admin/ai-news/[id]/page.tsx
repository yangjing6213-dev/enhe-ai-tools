import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSection } from "@/app/admin/admin-ui";
import { NewsArticleEditor } from "@/app/admin/ai-news-editor";
import { prisma } from "@/lib/db";
import { buildCanonicalAiNewsPath } from "@/lib/public-slugs";

type AdminAiNewsDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminAiNewsDetailPage({ params, searchParams }: AdminAiNewsDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const [article, categories, relatedArticles, tools, tutorials] = await Promise.all([
    isNew
      ? null
      : prisma.newsArticle.findUnique({
          where: { id },
          include: {
            category: true,
            tagLinks: { include: { tag: true } },
            externalSources: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }
          }
        }),
    prisma.newsCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.newsArticle.findMany({
      where: isNew ? {} : { id: { not: id } },
      select: { id: true, title: true, slug: true },
      orderBy: [{ updatedAt: "desc" }],
      take: 40
    }),
    prisma.tool.findMany({
      where: { status: "published" },
      select: { id: true, name: true, slug: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 60
    }),
    prisma.tutorial.findMany({
      where: { status: "active" },
      select: { id: true, title: true, tool: { select: { name: true } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 60
    })
  ]);
  if (!isNew && !article) notFound();

  return (
    <AdminSection title={isNew ? "新增 AI 资讯" : "编辑 AI 资讯"} intro="从资讯、趋势解读、工具落地和站内引导四个层面维护文章内容。">
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/admin/ai-news" className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
          返回资讯清单
        </Link>
        {article?.status === "published" ? (
          <Link href={buildCanonicalAiNewsPath(article, "zh")} target="_blank" className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
            打开前台页面
          </Link>
        ) : null}
      </div>

      {query.saved ? <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">保存成功。</p> : null}
      {query.error ? <p className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{query.error}</p> : null}

      <NewsArticleEditor article={article} categories={categories} relatedArticles={relatedArticles} tools={tools} tutorials={tutorials} />
    </AdminSection>
  );
}
