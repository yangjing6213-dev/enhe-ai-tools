import Link from "next/link";
import { AdminContentShell, AdminSection } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";

export default async function AdminFaqsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const faqs = await prisma.toolFaq.findMany({
    include: { tool: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
  });

  return (
    <AdminSection title="FAQ 管理" intro="FAQ 以清单方式展示，点击查看详情后再编辑问题、答案、状态或删除记录。">
      <AdminContentShell className="enhe-admin-content-management">
      <div className="enhe-admin-content-toolbar mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[#8B95A7]">共 {faqs.length} 条 FAQ</div>
        <Link href="/admin/faqs/new" className="enhe-admin-content-primary-action rounded-full px-5 py-3 text-sm font-semibold">
          新增 FAQ
        </Link>
      </div>

      {params.deleted ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">FAQ 已删除。</p>
      ) : null}

      <div className="enhe-admin-content-table enhe-admin-content-records overflow-x-auto rounded-2xl border border-white/12 bg-white/6">
        <div className="enhe-admin-content-table-heading grid min-w-[920px] grid-cols-[1.4fr_1fr_0.55fr_0.55fr_0.55fr] gap-4 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-wide text-[#8B95A7]">
          <span>问题</span>
          <span>绑定工具</span>
          <span>排序</span>
          <span>状态</span>
          <span className="text-right">操作</span>
        </div>
        <div className="enhe-admin-content-record-rows min-w-[920px] divide-y divide-white/10">
          {faqs.map((faq) => (
            <div key={faq.id} className="enhe-admin-content-row grid grid-cols-[1.4fr_1fr_0.55fr_0.55fr_0.55fr] gap-4 px-5 py-4 text-sm transition">
              <span className="truncate font-semibold text-[#E8EEF8]">{faq.question}</span>
              <span className="truncate text-[#C5D0E2]">{faq.tool.name}</span>
              <span>{faq.sortOrder}</span>
              <span>{faq.status === "active" ? "启用" : "禁用"}</span>
              <span className="text-right">
                <Link href={`/admin/faqs/${faq.id}`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
                  查看详情
                </Link>
              </span>
            </div>
          ))}
          {faqs.length === 0 ? <div className="px-5 py-10 text-center text-sm text-[#8B95A7]">暂无 FAQ。</div> : null}
        </div>
      </div>
      </AdminContentShell>
    </AdminSection>
  );
}
