import Link from "next/link";
import { deleteNewsTopicAction } from "@/app/admin/actions";
import { AdminContentShell, AdminSection, DangerButton } from "@/app/admin/admin-ui";
import { getAiNewsTopicPath } from "@/lib/ai-news-topics";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function isRecoverableNewsTopicReadError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const candidate = error as Error & { code?: unknown; meta?: { table?: unknown } };
  return (
    (candidate.code === "P2021" &&
      typeof candidate.meta?.table === "string" &&
      candidate.meta.table.includes("news_topics")) ||
    candidate.code === "P1001" ||
    /Can't reach database server/i.test(candidate.message) ||
    /ECONNREFUSED/i.test(candidate.message)
  );
}

async function getNewsTopics() {
  try {
    return await prisma.newsTopic.findMany({
      orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
    });
  } catch (error) {
    if (isRecoverableNewsTopicReadError(error)) return [];
    throw error;
  }
}

export default async function AdminAiNewsTopicsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [params, topics] = await Promise.all([searchParams, getNewsTopics()]);

  return (
    <AdminSection
      title="AI 资讯专题管理"
      intro="维护专题页、关键词匹配规则、FAQ、来源引用和站内推荐内链。文章会按专题关键词、标题、摘要、描述与标签自动归类到对应专题页。"
    >
      <AdminContentShell className="enhe-admin-content-management">
      <div className="enhe-admin-content-toolbar mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[var(--marketing-muted)]">
          共 {topics.length} 个专题。默认专题会在部署种子脚本中自动补齐，后台配置优先于静态兜底。
        </div>
        <Link
          href="/admin/ai-news/topics/new"
          className="enhe-admin-content-primary-action rounded-full px-5 py-3 text-sm font-semibold"
        >
          新增专题
        </Link>
      </div>

      {params.saved ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">
          专题已保存。
        </p>
      ) : null}
      {params.deleted ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">
          专题已删除。
        </p>
      ) : null}
      {params.error ? (
        <p className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {params.error}
        </p>
      ) : null}

      <div className="enhe-admin-content-table enhe-admin-content-records overflow-x-auto rounded-2xl border border-white/12 bg-white/6">
        <div className="enhe-admin-content-table-heading grid min-w-[980px] grid-cols-[1.1fr_0.9fr_0.6fr_0.55fr_0.8fr_0.8fr] gap-4 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-wide text-[#8B95A7]">
          <span>专题</span>
          <span>关键词规则</span>
          <span>状态</span>
          <span>排序</span>
          <span>更新时间</span>
          <span className="text-right">操作</span>
        </div>
        <div className="enhe-admin-content-record-rows min-w-[980px] divide-y divide-white/10">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="enhe-admin-content-row grid grid-cols-[1.1fr_0.9fr_0.6fr_0.55fr_0.8fr_0.8fr] gap-4 px-5 py-4 text-sm transition"
            >
              <div>
                <p className="font-semibold text-[#E8EEF8]">{topic.title}</p>
                <p className="mt-1 line-clamp-1 text-xs text-[#8B95A7]">
                  /ai-news/topics/{topic.slug}
                </p>
              </div>
              <div className="text-[#C5D0E2]">
                <p className="line-clamp-1">{topic.searchQuery}</p>
                <p className="mt-1 line-clamp-1 text-xs text-[#8B95A7]">
                  {topic.keywords.join("、") || "未配置关键词"}
                </p>
              </div>
              <span>{topic.status === "active" ? "启用" : "停用"}</span>
              <span>{topic.sortOrder}</span>
              <span className="text-[#8B95A7]">
                {topic.updatedAt.toLocaleDateString("zh-CN")}
              </span>
              <span className="flex justify-end gap-2">
                {topic.status === "active" ? (
                  <Link
                    href={getAiNewsTopicPath(topic.slug, "zh")}
                    className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]"
                    target="_blank"
                  >
                    前台
                  </Link>
                ) : null}
                <Link
                  href={`/admin/ai-news/topics/${topic.id}`}
                  className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]"
                >
                  编辑
                </Link>
                <form action={deleteNewsTopicAction}>
                  <input type="hidden" name="id" value={topic.id} />
                  <DangerButton className="px-3 py-2 text-xs" pendingLabel="删除中...">
                    删除
                  </DangerButton>
                </form>
              </span>
            </div>
          ))}
          {topics.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#8B95A7]">
              暂无后台专题配置。你可以从上方新增专题；前台继续使用现有静态专题页面。
            </div>
          ) : null}
        </div>
      </div>
      </AdminContentShell>
    </AdminSection>
  );
}
