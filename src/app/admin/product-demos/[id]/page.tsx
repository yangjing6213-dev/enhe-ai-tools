import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminContentShell, AdminSection } from "@/app/admin/admin-ui";
import { ProductDemoEditor } from "@/app/admin/product-demo-editor";
import { prisma } from "@/lib/db";
import { buildProductDemoPath } from "@/lib/product-demos";

type AdminProductDemoDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminProductDemoDetailPage({ params, searchParams }: AdminProductDemoDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const [demo, tools] = await Promise.all([
    isNew
      ? null
      : prisma.productDemo.findUnique({
          where: { id },
          include: { relatedProduct: true },
        }),
    prisma.tool.findMany({
      select: {
        id: true,
        name: true,
        englishName: true,
        slug: true,
        type: true,
        status: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 120,
    }),
  ]);
  if (!isNew && !demo) notFound();

  return (
    <AdminSection title={isNew ? "新增产品视频演示" : "编辑产品视频演示"} intro="配置首页产品效果演示、公开视频详情页、关联产品、FAQ、文字稿和 SEO/GEO 信息。">
      <AdminContentShell className="enhe-admin-content-management">
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/admin/product-demos" className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
          返回产品演示清单
        </Link>
        {demo?.status === "published" ? (
          <Link href={buildProductDemoPath(demo.slug, "zh")} target="_blank" className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
            打开前台页面
          </Link>
        ) : null}
      </div>

      {query.saved ? <p className="status-success mb-5">保存成功。</p> : null}
      {query.error ? <p className="status-danger mb-5">{query.error}</p> : null}

      <ProductDemoEditor demo={demo} tools={tools} />
      </AdminContentShell>
    </AdminSection>
  );
}
