import Link from "next/link";
import { AdminSection } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";

export default async function AdminChangelogsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const changelogs = await prisma.toolChangelog.findMany({
    include: { tool: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
  });

  return (
    <AdminSection title="工具版本管理" intro="工具版本记录以清单方式展示，点击查看详情后维护版本号、标题、发布时间、状态和更新内容。">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[#8B95A7]">共 {changelogs.length} 条版本记录</div>
        <Link href="/admin/changelogs/new" className="rounded-full bg-[#7AA7FF] px-5 py-3 text-sm font-semibold text-[#07101f]">
          新增版本记录
        </Link>
      </div>

      {params.deleted ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">版本记录已删除。</p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-white/12 bg-white/6">
        <div className="grid min-w-[980px] grid-cols-[0.65fr_1.15fr_1fr_0.7fr_0.55fr_0.55fr] gap-4 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-wide text-[#8B95A7]">
          <span>版本</span>
          <span>标题</span>
          <span>绑定工具</span>
          <span>发布日期</span>
          <span>状态</span>
          <span className="text-right">操作</span>
        </div>
        <div className="min-w-[980px] divide-y divide-white/10">
          {changelogs.map((changelog) => (
            <div key={changelog.id} className="grid grid-cols-[0.65fr_1.15fr_1fr_0.7fr_0.55fr_0.55fr] gap-4 px-5 py-4 text-sm transition hover:bg-white/5">
              <span className="font-semibold text-[#48F5D3]">{changelog.version}</span>
              <span className="truncate font-semibold text-[#E8EEF8]">{changelog.title}</span>
              <span className="truncate text-[#C5D0E2]">{changelog.tool.name}</span>
              <span className="text-[#8B95A7]">{changelog.releaseDate?.toLocaleDateString("zh-CN") ?? "-"}</span>
              <span>{changelog.status === "active" ? "启用" : "禁用"}</span>
              <span className="text-right">
                <Link href={`/admin/changelogs/${changelog.id}`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
                  查看详情
                </Link>
              </span>
            </div>
          ))}
          {changelogs.length === 0 ? <div className="px-5 py-10 text-center text-sm text-[#8B95A7]">暂无工具版本记录。</div> : null}
        </div>
      </div>
    </AdminSection>
  );
}
