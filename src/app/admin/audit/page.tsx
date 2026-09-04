import { AdminSection, inputClass, selectClass } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";

type AdminAuditPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

const pageSize = 30;

export default async function AdminAuditPage({ searchParams }: AdminAuditPageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const targetType = (params.targetType ?? "").trim();
  const parsedPage = Number(params.page ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const where = {
    ...(targetType ? { targetType } : {}),
    ...(q
      ? {
          OR: [
            { action: { contains: q, mode: "insensitive" as const } },
            { summary: { contains: q, mode: "insensitive" as const } },
            { targetId: { contains: q, mode: "insensitive" as const } },
            { admin: { email: { contains: q, mode: "insensitive" as const } } }
          ]
        }
      : {})
  };

  const [logs, total, targetTypes] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      include: { admin: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      distinct: ["targetType"],
      orderBy: { targetType: "asc" },
      select: { targetType: true }
    })
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const hrefFor = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (targetType) next.set("targetType", targetType);
    next.set("page", String(Math.max(1, nextPage)));
    return `/admin/audit?${next.toString()}`;
  };

  return (
    <AdminSection title="操作审计日志" intro="记录管理员在后台进行的关键操作，便于追踪订单、支付、用户、工具和文件变更。">
      <form className="glass mb-5 grid gap-3 rounded-2xl p-5 md:grid-cols-[1fr_220px_auto]" action="/admin/audit">
        <input name="q" defaultValue={q} placeholder="搜索操作、对象 ID、管理员邮箱" className={inputClass} />
        <select name="targetType" defaultValue={targetType} className={selectClass}>
          <option value="">全部对象</option>
          {targetTypes.map((item) => (
            <option key={item.targetType} value={item.targetType}>{item.targetType}</option>
          ))}
        </select>
        <button className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-[#E8EEF8]">筛选</button>
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#8B95A7]">
        <span>共 {total} 条日志，当前第 {page} / {pageCount} 页</span>
        <div className="flex gap-2">
          <a href={hrefFor(page - 1)} aria-disabled={page <= 1} className={`rounded-full border border-white/12 px-4 py-2 ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}>上一页</a>
          <a href={hrefFor(page + 1)} aria-disabled={page >= pageCount} className={`rounded-full border border-white/12 px-4 py-2 ${page >= pageCount ? "pointer-events-none opacity-40" : ""}`}>下一页</a>
        </div>
      </div>

      <div className="space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="glass rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{log.action}</p>
                <p className="mt-2 text-sm text-[#8B95A7]">{log.summary}</p>
                <p className="mt-2 text-xs text-[#8B95A7]">
                  {log.targetType}{log.targetId ? ` · ${log.targetId}` : ""} · {log.admin?.email ?? log.adminId ?? "system"}
                </p>
              </div>
              <div className="text-right text-xs text-[#8B95A7]">
                <p>{log.createdAt.toLocaleString("zh-CN")}</p>
                <p className="mt-1">{log.ip ?? ""}</p>
              </div>
            </div>
            {log.metadata ? (
              <pre className="mt-4 overflow-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-[#8B95A7]">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            ) : null}
          </div>
        ))}
        {logs.length === 0 ? <div className="glass rounded-2xl p-8 text-center text-sm text-[#8B95A7]">暂无审计日志。</div> : null}
      </div>
    </AdminSection>
  );
}
