import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AdminContentShell, AdminSection, inputClass, selectClass } from "@/app/admin/admin-ui";
import { DeleteProductDemoForm } from "@/app/admin/product-demo-editor";
import { HOME_PRODUCTS } from "@/lib/redesign/home/home-products";
import { prisma } from "@/lib/db";
import { buildProductDemoPath, getProductDemoCategoryLabel } from "@/lib/product-demos";

const pageSize = 20;

type AdminProductDemosPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminProductDemosPage({ searchParams }: AdminProductDemosPageProps) {
  const params = await searchParams;
  const q = params.q?.trim();
  const status =
    params.status === "draft" || params.status === "published" || params.status === "archived"
      ? params.status
      : "";
  const category =
    params.category === "software" || params.category === "skill_learning" || params.category === "account_service"
      ? params.category
      : "";
  const featured = params.featured === "true" ? true : params.featured === "false" ? false : undefined;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const where: Prisma.ProductDemoWhereInput = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(typeof featured === "boolean" ? { isFeaturedOnHome: featured } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { tags: { has: q } },
          ],
        }
      : {}),
  };
  const [demos, total] = await Promise.all([
    prisma.productDemo.findMany({
      where,
      include: { relatedProduct: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productDemo.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminSection title="产品演示管理" intro="查看首页实际展示的推荐产品，并维护独立的视频演示、FAQ、文字稿和关联产品。">
      <AdminContentShell className="enhe-admin-content-management">
      <section className="mb-8 rounded-2xl border border-white/12 p-5" aria-labelledby="home-product-showcase-heading">
        <h2 id="home-product-showcase-heading" className="text-xl font-bold">首页当前展示产品（{HOME_PRODUCTS.length} 项）</h2>
        <p className="mt-2 text-sm text-[#8B95A7]">这份名单与首页“热门AI推荐”轮播使用同一份配置。下方视频演示是独立内容，不是这份首页推荐名单。</p>
        <ol className="mt-4 divide-y divide-white/10">
          {HOME_PRODUCTS.map((product, index) => (
            <li key={product.id} data-home-showcase-product={product.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-semibold">{index + 1}. {product.name.zh}</p>
                <p className="mt-1 text-sm text-[#8B95A7]">{product.description.zh}</p>
              </div>
              <Link href={product.detailHref.zh} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-sm">查看商品详情</Link>
            </li>
          ))}
        </ol>
      </section>
      <h2 className="mb-4 text-xl font-bold">视频演示记录</h2>
      <div className="enhe-admin-content-toolbar mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[#8B95A7]">共 {total} 条视频演示</div>
        <Link href="/admin/product-demos/new" className="enhe-admin-content-primary-action rounded-full px-5 py-3 text-sm font-semibold">
          新增视频演示
        </Link>
      </div>

      {params.archived ? <p className="status-success mb-5">产品演示已下架。</p> : null}
      {params.deleted ? <p className="status-success mb-5">产品演示已删除。</p> : null}
      {params.error ? <p className="status-danger mb-5">{params.error}</p> : null}

      <form className="enhe-admin-content-form enhe-admin-content-filters mb-6 grid gap-3 rounded-2xl border border-white/12 bg-white/6 p-4 lg:grid-cols-[1fr_150px_180px_150px_130px]">
        <input name="q" defaultValue={q} placeholder="搜索标题、slug、描述、标签" className={inputClass} />
        <select name="status" defaultValue={status} className={selectClass}>
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="archived">下架</option>
        </select>
        <select name="category" defaultValue={category} className={selectClass}>
          <option value="">全部类型</option>
          <option value="software">AI软件应用</option>
          <option value="skill_learning">AI技能学习</option>
          <option value="account_service">AI账号服务</option>
        </select>
        <select name="featured" defaultValue={typeof featured === "boolean" ? String(featured) : ""} className={selectClass}>
          <option value="">旧版首页展示不限</option>
          <option value="true">旧版首页展示</option>
          <option value="false">不在旧版首页</option>
        </select>
        <button className="rounded-full bg-[#050505] px-5 py-3 text-sm font-bold text-white lg:col-span-5">筛选演示</button>
      </form>

      <div className="enhe-admin-content-table enhe-admin-content-records overflow-x-auto rounded-2xl border border-white/12 bg-white/6">
        <div className="enhe-admin-content-table-heading grid min-w-[1120px] grid-cols-[1.25fr_0.65fr_0.55fr_0.55fr_0.55fr_0.65fr_0.8fr] gap-4 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-wide text-[#8B95A7]">
          <span>标题</span>
          <span>类型/标签</span>
          <span>状态</span>
          <span>旧版首页</span>
          <span>排序</span>
          <span>更新时间</span>
          <span className="text-right">操作</span>
        </div>
        <div className="enhe-admin-content-record-rows min-w-[1120px] divide-y divide-white/10">
          {demos.map((demo) => (
            <div key={demo.id} className="enhe-admin-content-row grid grid-cols-[1.25fr_0.65fr_0.55fr_0.55fr_0.55fr_0.65fr_0.8fr] gap-4 px-5 py-4 text-sm transition">
              <div>
                <p className="font-semibold text-[#E8EEF8]">{demo.title}</p>
                <p className="mt-1 line-clamp-1 text-xs text-[#8B95A7]">/{demo.slug}</p>
                {demo.relatedProduct ? <p className="mt-1 line-clamp-1 text-xs text-[#8B95A7]">关联：{demo.relatedProduct.name}</p> : null}
              </div>
              <div className="text-[#C5D0E2]">
                <p>{getProductDemoCategoryLabel(demo.category, "zh")}</p>
                <p className="mt-1 line-clamp-1 text-xs text-[#8B95A7]">{demo.tags.join("、") || "无标签"}</p>
              </div>
              <span>{statusLabel(demo.status)}</span>
              <span>{demo.isFeaturedOnHome ? "展示" : "不展示"}</span>
              <span>{demo.sortOrder}</span>
              <span className="text-[#8B95A7]">{demo.updatedAt.toLocaleDateString("zh-CN")}</span>
              <span className="flex justify-end gap-2">
                {demo.status === "published" ? (
                  <Link href={buildProductDemoPath(demo.slug, "zh")} className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]" target="_blank">
                    预览
                  </Link>
                ) : null}
                <Link href={`/admin/product-demos/${demo.id}`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
                  编辑
                </Link>
                <DeleteProductDemoForm id={demo.id} />
              </span>
            </div>
          ))}
          {demos.length === 0 ? <div className="px-5 py-10 text-center text-sm text-[#8B95A7]">暂无产品演示。</div> : null}
        </div>
      </div>

      {pageCount > 1 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {Array.from({ length: pageCount }).map((_, index) => {
            const nextPage = index + 1;
            return (
              <Link key={nextPage} href={`/admin/product-demos?page=${nextPage}`} className={`rounded-full border px-4 py-2 text-sm ${page === nextPage ? "border-[#48F5D3]/50 text-[#48F5D3]" : "border-white/15 text-[#8B95A7]"}`}>
                {nextPage}
              </Link>
            );
          })}
        </div>
      ) : null}
      </AdminContentShell>
    </AdminSection>
  );
}

function statusLabel(status: "draft" | "published" | "archived") {
  if (status === "published") return "已发布";
  if (status === "archived") return "下架";
  return "草稿";
}
