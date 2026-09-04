import {
  deleteNewsKeywordInterventionAction,
  upsertNewsKeywordInterventionAction
} from "@/app/admin/actions";
import {
  AdminSection,
  DangerButton,
  Field,
  inputClass,
  selectClass,
  SubmitButton
} from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";
import { getPublicAiNewsDiscovery } from "@/lib/public-content";

function isMissingKeywordInterventionTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; meta?: { table?: unknown } };
  return candidate.code === "P2021" && typeof candidate.meta?.table === "string" && candidate.meta.table.includes("news_keyword_interventions");
}

async function getKeywordInterventions() {
  try {
    return await prisma.newsKeywordIntervention.findMany({
      orderBy: [{ locale: "asc" }, { isPinned: "desc" }, { updatedAt: "desc" }]
    });
  } catch (error) {
    if (isMissingKeywordInterventionTableError(error)) {
      return [];
    }

    throw error;
  }
}

export default async function AdminAiNewsKeywordsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const [interventions, zhDiscovery, enDiscovery] = await Promise.all([
    getKeywordInterventions(),
    getPublicAiNewsDiscovery("zh"),
    getPublicAiNewsDiscovery("en")
  ]);

  return (
    <AdminSection
      title="AI 前沿资讯关键词"
      intro="管理热门关键词的人工干预规则。专题合集仍保持自动生成，这里只负责关键词的置顶、隐藏、改名和权重提升。"
    >
      {params.saved ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">
          关键词干预规则已保存。
        </p>
      ) : null}
      {params.deleted ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">
          关键词干预规则已删除。
        </p>
      ) : null}

      <form action={upsertNewsKeywordInterventionAction} className="glass mb-8 grid gap-4 rounded-2xl p-6 md:grid-cols-2 xl:grid-cols-3">
        <Field label="关键词">
          <input name="keyword" required placeholder="例如：AI Agent" className={inputClass} />
        </Field>
        <Field label="语言">
          <select name="locale" defaultValue="zh" className={selectClass}>
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </Field>
        <Field label="展示名">
          <input name="displayName" placeholder="留空则沿用原关键词" className={inputClass} />
        </Field>
        <Field label="权重提升">
          <input name="weightBoost" type="number" defaultValue={0} className={inputClass} />
        </Field>
        <label className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-[var(--marketing-text)]">
          <input type="checkbox" name="isPinned" className="h-4 w-4 accent-[var(--marketing-accent)]" />
          置顶关键词
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-[var(--marketing-text)]">
          <input type="checkbox" name="isHidden" className="h-4 w-4 accent-[var(--marketing-accent)]" />
          从前台隐藏
        </label>
        <div className="md:col-span-2 xl:col-span-3">
          <SubmitButton>新增干预规则</SubmitButton>
        </div>
      </form>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass rounded-2xl p-6">
          <h2 className="text-xl font-black text-[var(--marketing-text)]">中文热门关键词预览</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {zhDiscovery.keywordCloudItems.length ? (
              zhDiscovery.keywordCloudItems.map((item) => (
                <div key={`zh-${item.keyword}`} className="rounded-full border border-white/14 bg-white/7 px-3 py-2 text-sm text-[var(--marketing-text)]">
                  <span className="font-semibold">{item.displayName}</span>
                  <span className="ml-2 text-xs text-[var(--marketing-muted)]">
                    分数 {Math.round(item.score)} / 文章 {item.articleCount}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--marketing-muted)]">当前还没有可展示的中文关键词。</p>
            )}
          </div>
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="text-xl font-black text-[var(--marketing-text)]">英文热门关键词预览</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {enDiscovery.keywordCloudItems.length ? (
              enDiscovery.keywordCloudItems.map((item) => (
                <div key={`en-${item.keyword}`} className="rounded-full border border-white/14 bg-white/7 px-3 py-2 text-sm text-[var(--marketing-text)]">
                  <span className="font-semibold">{item.displayName}</span>
                  <span className="ml-2 text-xs text-[var(--marketing-muted)]">
                    Score {Math.round(item.score)} / Articles {item.articleCount}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--marketing-muted)]">No English keywords are currently eligible for display.</p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-black text-[var(--marketing-text)]">现有干预规则</h2>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {interventions.length ? (
            interventions.map((item) => (
              <div key={item.id} className="glass rounded-2xl p-6">
                <form action={upsertNewsKeywordInterventionAction} className="grid gap-3">
                  <input type="hidden" name="id" value={item.id} />
                  <Field label="关键词">
                    <input name="keyword" defaultValue={item.keyword} required className={inputClass} />
                  </Field>
                  <Field label="语言">
                    <select name="locale" defaultValue={item.locale} className={selectClass}>
                      <option value="zh">中文</option>
                      <option value="en">English</option>
                    </select>
                  </Field>
                  <Field label="展示名">
                    <input name="displayName" defaultValue={item.displayName ?? ""} className={inputClass} />
                  </Field>
                  <Field label="权重提升">
                    <input name="weightBoost" type="number" defaultValue={item.weightBoost} className={inputClass} />
                  </Field>
                  <label className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-[var(--marketing-text)]">
                    <input type="checkbox" name="isPinned" defaultChecked={item.isPinned} className="h-4 w-4 accent-[var(--marketing-accent)]" />
                    置顶关键词
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-[var(--marketing-text)]">
                    <input type="checkbox" name="isHidden" defaultChecked={item.isHidden} className="h-4 w-4 accent-[var(--marketing-accent)]" />
                    从前台隐藏
                  </label>
                  <SubmitButton>保存规则</SubmitButton>
                </form>
                <form action={deleteNewsKeywordInterventionAction} className="mt-3">
                  <input type="hidden" name="id" value={item.id} />
                  <DangerButton>删除规则</DangerButton>
                </form>
              </div>
            ))
          ) : (
            <div className="glass rounded-2xl p-6 text-sm text-[var(--marketing-muted)]">
              还没有人工干预规则，当前前台将完全使用自动生成结果。
            </div>
          )}
        </div>
      </section>
    </AdminSection>
  );
}
