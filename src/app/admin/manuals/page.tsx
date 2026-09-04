import Link from "next/link";
import { AdminSection } from "@/app/admin/admin-ui";
import { operationManuals } from "@/lib/operation-manuals";

export default function AdminManualsPage() {
  return (
    <AdminSection
      title="操作说明"
      intro="统一存放网站运营、SEO、GEO、后台使用和交付流程说明。后续新增说明书放入 docs/operation-manuals 并登记配置后，会出现在这里。"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {operationManuals.map((manual) => (
          <article key={manual.slug} className="surface-panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold text-[var(--marketing-muted)]">
                {manual.category}
              </span>
              <time className="text-xs text-[var(--marketing-muted)]" dateTime={manual.updatedAt}>
                更新于 {manual.updatedAt}
              </time>
            </div>
            <h2 className="mt-5 text-xl font-semibold leading-7 text-[#E8EEF8]">{manual.title}</h2>
            <p className="mt-3 min-h-14 text-sm leading-7 text-[var(--marketing-muted)]">{manual.description}</p>
            <Link
              href={`/admin/manuals/view/${manual.slug}`}
              target="_blank"
              className="mt-5 inline-flex rounded-full bg-[var(--marketing-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff8f5a]"
            >
              打开说明
            </Link>
          </article>
        ))}
      </div>
    </AdminSection>
  );
}
