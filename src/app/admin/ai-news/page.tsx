import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { deleteNewsArticleAction } from "@/app/admin/actions";
import { AdminSection, DangerButton, inputClass, selectClass } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";
import { buildCanonicalAiNewsPath } from "@/lib/public-slugs";

const pageSize = 20;

export default async function AdminAiNewsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const q = params.q?.trim();
  const status = params.status === "draft" || params.status === "published" || params.status === "archived" ? params.status : "";
  const category = params.category?.trim() || "";
  const tag = params.tag?.trim() || "";
  const sort = params.sort === "views" || params.sort === "featured" ? params.sort : "latest";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const where: Prisma.NewsArticleWhereInput = {
    ...(status ? { status } : {}),
    ...(category ? { categoryId: category } : {}),
    ...(tag ? { tagLinks: { some: { tag: { slug: tag } } } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { subtitle: { contains: q, mode: "insensitive" } },
            { summary: { contains: q, mode: "insensitive" } },
            { keywords: { contains: q, mode: "insensitive" } },
            { englishTitle: { contains: q, mode: "insensitive" } }
          ]
        }
      : {})
  };
  const orderBy: Prisma.NewsArticleOrderByWithRelationInput[] =
    sort === "views"
      ? [{ viewCount: "desc" }, { updatedAt: "desc" }]
      : sort === "featured"
        ? [{ isPinned: "desc" }, { isFeatured: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }]
        : [{ updatedAt: "desc" }];
  const [articles, total, categories, tags] = await Promise.all([
    prisma.newsArticle.findMany({
      where,
      include: { category: true, tagLinks: { include: { tag: true } } },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.newsArticle.count({ where }),
    prisma.newsCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.newsTag.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminSection title="AI资讯管理" intro="维护 AI 资讯、趋势解读、工具落地引导和中英文 SEO 内容。">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[#8B95A7]">共 {total} 篇资讯</div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/ai-news/import" className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
            导入 HTML
          </Link>
          <Link href="/admin/ai-news/new" className="rounded-full bg-[#7AA7FF] px-5 py-3 text-sm font-semibold text-[#07101f]">
            新增资讯
          </Link>
        </div>
      </div>

      {params.archived ? <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">资讯已归档。</p> : null}
      {params.deleted ? <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">资讯已删除。</p> : null}
      {params.error ? <p className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{params.error}</p> : null}

      <form className="mb-6 grid gap-3 rounded-2xl border border-white/12 bg-white/6 p-4 lg:grid-cols-[1fr_150px_180px_150px_130px]">
        <input name="q" defaultValue={q} placeholder="搜索标题、摘要、关键词" className={inputClass} />
        <select name="status" defaultValue={status} className={selectClass}>
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="archived">已归档</option>
        </select>
        <select name="category" defaultValue={category} className={selectClass}>
          <option value="">全部分类</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select name="tag" defaultValue={tag} className={selectClass}>
          <option value="">全部标签</option>
          {tags.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} className={selectClass}>
          <option value="latest">最近更新</option>
          <option value="views">阅读量</option>
          <option value="featured">推荐优先</option>
        </select>
        <button className="rounded-full bg-[#050505] px-5 py-3 text-sm font-bold text-white lg:col-span-5">筛选资讯</button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-white/12 bg-white/6">
        <div className="grid min-w-[1120px] grid-cols-[1.45fr_0.65fr_0.55fr_0.6fr_0.45fr_0.65fr_0.7fr] gap-4 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-wide text-[#8B95A7]">
          <span>标题</span>
          <span>分类/标签</span>
          <span>状态</span>
          <span>推荐</span>
          <span>阅读</span>
          <span>更新时间</span>
          <span className="text-right">操作</span>
        </div>
        <div className="min-w-[1120px] divide-y divide-white/10">
          {articles.map((article) => (
            <div key={article.id} className="grid grid-cols-[1.45fr_0.65fr_0.55fr_0.6fr_0.45fr_0.65fr_0.7fr] gap-4 px-5 py-4 text-sm transition hover:bg-white/5">
              <div>
                <p className="font-semibold text-[#E8EEF8]">{article.title}</p>
                <p className="mt-1 line-clamp-1 text-xs text-[#8B95A7]">/{article.slug}</p>
              </div>
              <div className="text-[#C5D0E2]">
                <p>{article.category?.name ?? "未分类"}</p>
                <p className="mt-1 line-clamp-1 text-xs text-[#8B95A7]">{article.tagLinks.map(({ tag: item }) => item.name).join("、") || "无标签"}</p>
              </div>
              <span>{statusLabel(article.status)}</span>
              <span>{[article.isPinned ? "置顶" : "", article.isFeatured ? "推荐" : ""].filter(Boolean).join(" / ") || "普通"}</span>
              <span>{article.viewCount}</span>
              <span className="text-[#8B95A7]">{article.updatedAt.toLocaleDateString("zh-CN")}</span>
              <span className="flex justify-end gap-2">
                {article.status === "published" ? (
                  <Link href={buildCanonicalAiNewsPath(article, "zh")} className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]" target="_blank">
                    预览
                  </Link>
                ) : null}
                <Link href={`/admin/ai-news/${article.id}`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
                  编辑
                </Link>
                <form action={deleteNewsArticleAction}>
                  <input type="hidden" name="id" value={article.id} />
                  <DangerButton className="px-3 py-2 text-xs" pendingLabel="删除中...">删除</DangerButton>
                </form>
              </span>
            </div>
          ))}
          {articles.length === 0 ? <div className="px-5 py-10 text-center text-sm text-[#8B95A7]">暂无资讯。</div> : null}
        </div>
      </div>

      {pageCount > 1 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {Array.from({ length: pageCount }).map((_, index) => {
            const nextPage = index + 1;
            return (
              <Link key={nextPage} href={`/admin/ai-news?page=${nextPage}`} className={`rounded-full border px-4 py-2 text-sm ${page === nextPage ? "border-[#48F5D3]/50 text-[#48F5D3]" : "border-white/15 text-[#8B95A7]"}`}>
                {nextPage}
              </Link>
            );
          })}
        </div>
      ) : null}
    </AdminSection>
  );
}

function statusLabel(status: "draft" | "published" | "archived") {
  if (status === "published") return "已发布";
  if (status === "archived") return "已归档";
  return "草稿";
}
