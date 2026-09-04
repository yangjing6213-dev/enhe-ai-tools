import Link from "next/link";
import { AdminSection } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";

export default async function AdminTutorialsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const tutorials = await prisma.tutorial.findMany({
    include: { tool: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
  });

  return (
    <AdminSection title="教程管理" intro="教程记录以清单方式展示，点击查看详情进入单独编辑页维护正文、图片、视频、注意事项和常见错误。">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[#8B95A7]">共 {tutorials.length} 条教程</div>
        <Link href="/admin/tutorials/new" className="rounded-full bg-[#7AA7FF] px-5 py-3 text-sm font-semibold text-[#07101f]">
          新增教程
        </Link>
      </div>

      {params.deleted ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">教程已删除。</p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-white/12 bg-white/6">
        <div className="grid min-w-[920px] grid-cols-[1.2fr_1fr_0.55fr_0.55fr_0.65fr_0.55fr] gap-4 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-wide text-[#8B95A7]">
          <span>教程标题</span>
          <span>绑定工具</span>
          <span>排序</span>
          <span>状态</span>
          <span>创建时间</span>
          <span className="text-right">操作</span>
        </div>
        <div className="min-w-[920px] divide-y divide-white/10">
          {tutorials.map((tutorial) => (
            <div key={tutorial.id} className="grid grid-cols-[1.2fr_1fr_0.55fr_0.55fr_0.65fr_0.55fr] gap-4 px-5 py-4 text-sm transition hover:bg-white/5">
              <span className="font-semibold text-[#E8EEF8]">{tutorial.title}</span>
              <span className="truncate text-[#C5D0E2]">{tutorial.tool.name}</span>
              <span>{tutorial.sortOrder}</span>
              <span>{tutorial.status === "active" ? "启用" : "禁用"}</span>
              <span className="text-[#8B95A7]">{tutorial.createdAt.toLocaleDateString("zh-CN")}</span>
              <span className="text-right">
                <Link href={`/admin/tutorials/${tutorial.id}`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
                  查看详情
                </Link>
              </span>
            </div>
          ))}
          {tutorials.length === 0 ? <div className="px-5 py-10 text-center text-sm text-[#8B95A7]">暂无教程。</div> : null}
        </div>
      </div>
    </AdminSection>
  );
}
