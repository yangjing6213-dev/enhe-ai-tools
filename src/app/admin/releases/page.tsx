import {
  deleteProductReleaseAction,
  upsertProductReleaseAction
} from "@/app/admin/actions";
import { AdminSection, DangerButton, Field, inputClass, selectClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";
import { productReleaseStatusMeta, releaseLayerLabels, summarizeReleaseLayers } from "@/lib/release-layer";

export default async function AdminProductReleasesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const [releases, developmentVersions, toolChangelogCount] = await Promise.all([
    prisma.productRelease.findMany({
      include: { developmentVersion: true },
      orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }]
    }),
    prisma.developmentVersion.findMany({ orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }] }),
    prisma.toolChangelog.count()
  ]);
  const layerSummary = summarizeReleaseLayers({
    developmentVersions: developmentVersions.length,
    productReleases: releases.length,
    toolChangelogs: toolChangelogCount
  });

  return (
    <AdminSection
      title="产品发布版本管理"
      intro="用于记录面向用户的网站产品版本，并关联后台开发版本；工具自己的版本更新仍在工具版本管理中维护。"
    >
      {params.saved ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">
          产品版本已保存。
        </p>
      ) : null}
      {params.deleted ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">
          产品版本已删除。
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {layerSummary.map((layer) => (
          <div key={layer.key} className="glass rounded-2xl p-5">
            <p className="text-sm text-[#8B95A7]">{layer.label}</p>
            <p className="mt-3 text-3xl font-semibold text-[#48F5D3]">{layer.count}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[380px_1fr]">
        <ProductReleaseForm developmentVersions={developmentVersions} />

        <section className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">三层版本关系</h2>
            <div className="mt-5 grid gap-3 text-sm text-[#8B95A7]">
              <LayerLine label={releaseLayerLabels.development} text="研发进度与功能完成度，维护在开发进度驾驶舱。" />
              <LayerLine label={releaseLayerLabels.product} text="面向网站用户的产品发布记录，当前页面维护。" />
              <LayerLine label={releaseLayerLabels.tool} text="每个工具自己的版本更新记录，维护在工具版本管理。" />
            </div>
          </div>

          {releases.map((release) => (
            <div key={release.id} className="glass rounded-2xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#48F5D3]">Product Release</p>
                  <h2 className="mt-2 text-2xl font-semibold">{release.version} · {release.name}</h2>
                  {release.description ? <p className="mt-3 text-sm leading-6 text-[#8B95A7]">{release.description}</p> : null}
                  <p className="mt-3 text-xs text-[#8B95A7]">
                    关联开发版本：{release.developmentVersion ? `${release.developmentVersion.version} · ${release.developmentVersion.name}` : "未关联"} ·{" "}
                    发布日期：{release.releaseDate ? release.releaseDate.toLocaleDateString("zh-CN") : "未设置"}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs ${productReleaseStatusMeta[release.status].className}`}>
                  {productReleaseStatusMeta[release.status].label}
                </span>
              </div>

              <details className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[#E8EEF8]">查看 / 编辑</summary>
                <div className="mt-5 border-t border-white/10 pt-5">
                  <ProductReleaseForm release={release} developmentVersions={developmentVersions} />
                  <form action={deleteProductReleaseAction} className="mt-4">
                    <input type="hidden" name="id" value={release.id} />
                    <DangerButton>删除产品版本</DangerButton>
                  </form>
                </div>
              </details>
            </div>
          ))}
        </section>
      </div>
    </AdminSection>
  );
}

function ProductReleaseForm({
  release,
  developmentVersions
}: {
  release?: {
    id: string;
    version: string;
    name: string;
    description: string | null;
    status: keyof typeof productReleaseStatusMeta;
    developmentVersionId: string | null;
    releaseDate: Date | null;
    sortOrder: number;
  };
  developmentVersions: { id: string; version: string; name: string }[];
}) {
  return (
    <form action={upsertProductReleaseAction} className="glass grid gap-4 rounded-2xl p-6 md:grid-cols-2">
      {release ? <input type="hidden" name="id" value={release.id} /> : null}
      <h2 className="md:col-span-2 text-xl font-semibold">{release ? "编辑产品版本" : "新增产品版本"}</h2>
      <Field label="产品版本号"><input name="version" required defaultValue={release?.version ?? "V1.0"} className={inputClass} /></Field>
      <Field label="版本名称"><input name="name" required defaultValue={release?.name ?? ""} placeholder="商业闭环版" className={inputClass} /></Field>
      <Field label="状态">
        <select name="status" defaultValue={release?.status ?? "active"} className={selectClass}>
          {Object.entries(productReleaseStatusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
        </select>
      </Field>
      <Field label="关联开发版本">
        <select name="developmentVersionId" defaultValue={release?.developmentVersionId ?? ""} className={selectClass}>
          <option value="">不关联</option>
          {developmentVersions.map((version) => <option key={version.id} value={version.id}>{version.version} · {version.name}</option>)}
        </select>
      </Field>
      <Field label="发布日期"><input name="releaseDate" type="date" defaultValue={release?.releaseDate?.toISOString().slice(0, 10) ?? ""} className={inputClass} /></Field>
      <Field label="排序"><input name="sortOrder" type="number" defaultValue={release?.sortOrder ?? 10} className={inputClass} /></Field>
      <Field label="版本说明" className="md:col-span-2">
        <textarea name="description" defaultValue={release?.description ?? ""} className={textareaClass} />
      </Field>
      <div className="md:col-span-2"><SubmitButton>{release ? "保存产品版本" : "新增产品版本"}</SubmitButton></div>
    </form>
  );
}

function LayerLine({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="font-semibold text-[#E8EEF8]">{label}</span>
      <span> · {text}</span>
    </div>
  );
}
