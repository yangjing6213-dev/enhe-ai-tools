import Link from "next/link";
import type { DevelopmentItem, DevelopmentVersion } from "@prisma/client";
import {
  deleteDevelopmentItemAction,
  deleteDevelopmentVersionAction,
  upsertDevelopmentItemAction,
  upsertDevelopmentVersionAction
} from "@/app/admin/actions";
import { AdminSection, DangerButton, Field, inputClass, selectClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";
import {
  calculateDevelopmentSummary,
  getDevelopmentPriorityMeta,
  getDevelopmentStatusMeta,
  getDevelopmentVersionStatusMeta,
  groupDevelopmentItemsByModule,
  type DevelopmentItemStatus
} from "@/lib/development-progress";
import { getCurrentLocale, type Locale } from "@/lib/i18n";

type VersionWithItems = DevelopmentVersion & { items: DevelopmentItem[] };
type ReadonlyDevelopmentItem = Pick<DevelopmentItem, "id" | "module" | "name" | "status" | "priority" | "relatedFiles" | "notes" | "sortOrder" | "updatedAt">;

const defaultDevelopmentItems = [
  ["基础页面", "首页与工具入口", "completed", "medium", "src/app/page.tsx, src/app/software/page.tsx, src/app/online-tools/page.tsx", "首页、AI软件应用、AI账号服务入口已具备。", 10],
  ["用户与权限", "注册登录与用户中心", "completed", "high", "src/app/(auth), src/app/user/page.tsx, src/lib/auth.ts", "已支持注册、登录、退出、用户中心和会话安全。", 20],
  ["用户与权限", "管理员后台权限", "completed", "high", "src/app/admin/layout.tsx, src/lib/auth.ts", "普通用户不能进入后台，管理员可访问后台菜单。", 30],
  ["工具系统", "工具分类后台自定义", "completed", "high", "src/app/admin/categories/page.tsx", "AI软件应用与AI账号服务分类由后台维护。", 40],
  ["工具系统", "AI软件应用管理", "completed", "high", "src/app/admin/software/page.tsx, src/app/admin/software/[id]/page.tsx", "已支持清单、详情编辑、封面上传、下载文件绑定和上架检查。", 50],
  ["工具系统", "AI账号服务管理", "completed", "high", "src/app/admin/online-tools/page.tsx, src/app/admin/online-tools/[id]/page.tsx", "已支持服务信息、服务价格和上架管理。", 60],
  ["工具系统", "工具详情页与教程", "completed", "high", "src/app/tools/[slug]/page.tsx, src/app/admin/tutorials/page.tsx", "详情页已展示教程、截图、评论和相关推荐；教程支持注意事项与常见错误。", 70],
  ["付费下载与订单", "套餐功能停用", "completed", "high", "src/app/admin/plans/page.tsx, src/app/pricing/page.tsx", "统一套餐入口已下线，收费软件改为按工具单独购买。", 80],
  ["付费下载与订单", "订单创建与取消", "completed", "high", "src/app/actions.ts, src/app/user/page.tsx", "用户可创建软件订单，并可取消允许取消状态的订单。", 90],
  ["付费下载与订单", "个人收款码支付页", "completed", "high", "src/app/orders/[id]/pay/page.tsx, public/images/payment", "支付页已展示支付宝和微信收款码，并提示备注订单号。", 100],
  ["付费下载与订单", "付款截图上传与预览", "completed", "high", "src/app/api/uploads/payment-proof/route.ts, src/app/orders/[id]/page.tsx", "上传后进入订单详情并展示付款凭证预览。", 110],
  ["付费下载与订单", "后台支付审核自动开通软件权益", "completed", "high", "src/app/actions.ts, src/lib/membership.ts", "审核通过后创建对应工具的软件购买权益。", 120],
  ["权限控制", "收费软件下载权限", "completed", "high", "src/app/api/tools/[id]/download/route.ts, src/lib/access.ts", "下载权限在服务端校验。", 130],
  ["权限控制", "AI账号服务使用记录", "completed", "high", "src/app/api/tools/[id]/use/route.ts, src/lib/access.ts", "AI账号服务入口在服务端校验权限并记录使用日志。", 140],
  ["内容互动", "用户评论与后台审核", "completed", "medium", "src/app/tools/[slug]/page.tsx, src/app/admin/comments/page.tsx", "评论需后台审核，支持置顶和删除。", 150],
  ["文件与存储", "文件上传与 COS 闭环", "completed", "high", "src/lib/storage.ts, src/app/admin/files/page.tsx", "已支持本地上传、COS 环境变量自动切换、配置体检、远程对象删除和失败提示。", 160],
  ["售后与通知", "退款/售后记录", "completed", "medium", "src/app/orders/[id]/page.tsx, src/app/admin/orders/page.tsx", "用户可申请售后/退款，后台可处理并记录。", 170],
  ["售后与通知", "站内通知", "completed", "medium", "src/app/user/page.tsx, src/lib/notifications.ts", "支付审核和退款处理会通知用户。", 180],
  ["部署运维", "Docker 与腾讯云部署配置", "completed", "high", "Dockerfile, deploy.sh, deploy/enhe-ai-tools", "已拆分独立部署文件，避免影响旧项目端口。", 190],
  ["安全与质量", "关键流程测试", "partial", "medium", "src/lib/*.test.ts, tests/e2e/commercial-flow.spec.ts", "核心单元测试和商业闭环 E2E 已存在；后续可补更多管理端浏览器回归。", 200],
  ["运营后台", "管理员消息中心", "completed", "medium", "src/app/admin/messages/page.tsx", "已集中展示待审核付款、退款申请和上传异常。", 210],
  ["运营后台", "产品发布版本管理", "completed", "medium", "src/app/admin/releases/page.tsx", "已打通开发版本、产品版本、工具版本三层记录。", 220]
] as const;

export default async function AdminDevelopmentPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const locale = await getCurrentLocale();
  const copy = developmentCopy[locale];
  const statusMeta = getDevelopmentStatusMeta(locale);
  const priorityMeta = getDevelopmentPriorityMeta(locale);
  const versionStatusMeta = getDevelopmentVersionStatusMeta(locale);
  const dateLocale = locale === "en" ? "en-US" : "zh-CN";
  const versions = await prisma.developmentVersion.findMany({
    include: {
      items: {
        orderBy: [{ module: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      }
    },
    orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }]
  });
  const selectedVersion = versions.find((version) => version.id === params.version) ?? versions.find((version) => version.status === "active") ?? versions[0] ?? null;
  const fallbackUpdatedAt = new Date("2026-05-22T00:00:00");
  const fallbackItems: ReadonlyDevelopmentItem[] = defaultDevelopmentItems.map(([module, name, status, priority, relatedFiles, notes, sortOrder]) => ({
    id: `default-${sortOrder}`,
    module,
    name,
    status,
    priority,
    relatedFiles,
    notes,
    sortOrder,
    updatedAt: fallbackUpdatedAt
  }));
  const displayVersion = selectedVersion ?? {
    version: "V1.0",
    name: locale === "en" ? "Commercial loop edition" : "商业闭环版",
    description: locale === "en"
      ? "Default progress snapshot. Create a version or run seed to maintain these progress items in the database."
      : "默认进度快照。创建版本或运行 seed 后可在数据库中维护这些进度项。",
    status: "active" as const
  };
  const displayItems = localizeDevelopmentItems(selectedVersion?.items ?? fallbackItems, locale);
  const summary = calculateDevelopmentSummary(displayItems as { status: DevelopmentItemStatus }[]);
  const groupedItems = groupDevelopmentItemsByModule(displayItems);
  const [productReleaseCount, toolChangelogCount] = await Promise.all([
    prisma.productRelease.count(),
    prisma.toolChangelog.count()
  ]);

  return (
    <AdminSection
      title={copy.title}
      intro={copy.intro}
    >
      {params.deleted ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">
          {copy.deleted}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="glass rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-[#48F5D3]">{copy.currentVersion}</p>
              <h2 className="mt-2 text-3xl font-semibold">{`${displayVersion.version} · ${localizeDevelopmentValue(displayVersion.name, locale)}`}</h2>
              {displayVersion.description ? (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8B95A7]">
                  {localizeDevelopmentValue(displayVersion.description, locale)}
                </p>
              ) : null}
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#8B95A7]">
              {versionStatusMeta[displayVersion.status]}
            </span>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-5">
            <ProgressStat label={copy.completion} value={`${summary.completionPercent}%`} accent />
            <ProgressStat label={copy.totalItems} value={summary.total} />
            <ProgressStat label={copy.completed} value={summary.completed} />
            <ProgressStat label={copy.partial} value={summary.partial} />
            <ProgressStat label={copy.todo} value={summary.notStarted + summary.recommended} />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Link href="/admin/development" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#8B95A7] hover:border-[#48F5D3]/40">
              {copy.developmentVersions} · {versions.length}
            </Link>
            <Link href="/admin/releases" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#8B95A7] hover:border-[#48F5D3]/40">
              {copy.productVersions} · {productReleaseCount}
            </Link>
            <Link href="/admin/changelogs" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#8B95A7] hover:border-[#48F5D3]/40">
              {copy.toolVersions} · {toolChangelogCount}
            </Link>
          </div>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-gradient-to-r from-[#48F5D3] via-[#7AA7FF] to-[#A78BFA]" style={{ width: `${summary.completionPercent}%` }} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {versions.map((version) => (
              <Link
                key={version.id}
                href={`/admin/development?version=${version.id}`}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  selectedVersion?.id === version.id
                    ? "border-[#48F5D3]/50 bg-[#48F5D3]/10 text-[#48F5D3]"
                    : "border-white/10 text-[#8B95A7] hover:border-[#48F5D3]/40 hover:text-[#48F5D3]"
                }`}
              >
                {version.version}
              </Link>
            ))}
          </div>
        </section>

        <VersionForm version={selectedVersion} locale={locale} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {groupedItems.map((group) => (
            <section key={group.module} className="glass rounded-2xl p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{group.module}</h2>
                <span className="text-xs text-[#8B95A7]">{copy.itemCount.replace("{count}", String(group.items.length))}</span>
              </div>
              <div className="space-y-4">
                {group.items.map((item) =>
                  selectedVersion ? (
                    <DevelopmentItemCard key={item.id} item={item as DevelopmentItem} versionId={selectedVersion.id} locale={locale} />
                  ) : (
                    <ReadonlyDevelopmentItemCard key={item.id} item={item as ReadonlyDevelopmentItem} locale={locale} />
                  )
                )}
              </div>
            </section>
          ))}
        </div>

        <div className="space-y-6">
          {selectedVersion ? (
            <>
            <DevelopmentItemForm versionId={selectedVersion.id} locale={locale} />
            <form action={deleteDevelopmentVersionAction} className="glass rounded-2xl border border-red-400/20 p-6">
              <input type="hidden" name="id" value={selectedVersion.id} />
              <h2 className="text-xl font-semibold text-red-100">{copy.deleteVersionTitle}</h2>
              <p className="mt-3 text-sm leading-6 text-[#8B95A7]">{copy.deleteVersionIntro}</p>
              <div className="mt-5">
                <DangerButton>{copy.deleteVersion}</DangerButton>
              </div>
            </form>
            </>
          ) : (
            <div className="glass rounded-2xl p-6 text-sm leading-6 text-[#8B95A7]">
              {copy.defaultSnapshot}
            </div>
          )}
        </div>
      </div>
    </AdminSection>
  );
}

function ProgressStat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/6 p-4">
      <p className="text-xs text-[#8B95A7]">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent ? "text-[#48F5D3]" : "text-[#E8EEF8]"}`}>{value}</p>
    </div>
  );
}

function VersionForm({ version, locale }: { version: VersionWithItems | null; locale: Locale }) {
  const copy = developmentCopy[locale];
  const versionStatusMeta = getDevelopmentVersionStatusMeta(locale);
  return (
    <form action={upsertDevelopmentVersionAction} className="glass grid gap-4 rounded-2xl p-6 md:grid-cols-2">
      {version ? <input type="hidden" name="id" value={version.id} /> : null}
      <h2 className="md:col-span-2 text-xl font-semibold">{version ? copy.editVersion : copy.newVersion}</h2>
      <Field label={copy.versionNo}><input name="version" required defaultValue={version?.version ?? "V1.0"} className={inputClass} /></Field>
      <Field label={copy.versionName}><input name="name" required defaultValue={version?.name ?? ""} placeholder={copy.versionNamePlaceholder} className={inputClass} /></Field>
      <Field label={copy.status}>
        <select name="status" defaultValue={version?.status ?? "active"} className={selectClass}>
          {Object.entries(versionStatusMeta).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <Field label={copy.sortOrder}><input name="sortOrder" type="number" defaultValue={version?.sortOrder ?? 10} className={inputClass} /></Field>
      <Field label={copy.startedAt}><input name="startedAt" type="date" defaultValue={formatDateInput(version?.startedAt)} className={inputClass} /></Field>
      <Field label={copy.releasedAt}><input name="releasedAt" type="date" defaultValue={formatDateInput(version?.releasedAt)} className={inputClass} /></Field>
      <Field label={copy.versionDescription} className="md:col-span-2">
        <textarea name="description" defaultValue={version?.description ?? ""} className={textareaClass} />
      </Field>
      <div className="md:col-span-2"><SubmitButton>{version ? copy.saveVersion : copy.createVersion}</SubmitButton></div>
    </form>
  );
}

function DevelopmentItemCard({ item, versionId, locale }: { item: DevelopmentItem; versionId: string; locale: Locale }) {
  const copy = developmentCopy[locale];
  const statusMeta = getDevelopmentStatusMeta(locale);
  const priorityMeta = getDevelopmentPriorityMeta(locale);
  const dateLocale = locale === "en" ? "en-US" : "zh-CN";
  const meta = statusMeta[item.status];
  return (
    <details className="rounded-xl border border-white/10 bg-white/6 p-4" open={false}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-[#E8EEF8]">{item.name}</h3>
            <p className="mt-2 text-xs text-[#8B95A7]">
              {priorityMeta[item.priority].label} · {copy.updatedAt.replace("{date}", item.updatedAt.toLocaleDateString(dateLocale))}
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs ${meta.className}`}>{meta.label}</span>
        </div>
        {item.notes ? <p className="mt-3 text-sm leading-6 text-[#8B95A7]">{item.notes}</p> : null}
        {item.relatedFiles ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {splitRelatedFiles(item.relatedFiles).map((file) => (
              <code key={file} className="rounded-full border border-white/10 px-2 py-1 text-xs text-[#8B95A7]">{file}</code>
            ))}
          </div>
        ) : null}
      </summary>
      <div className="mt-5 border-t border-white/10 pt-5">
        <DevelopmentItemForm item={item} versionId={versionId} locale={locale} />
        <form action={deleteDevelopmentItemAction} className="mt-4">
          <input type="hidden" name="id" value={item.id} />
          <DangerButton>{copy.deleteItem}</DangerButton>
        </form>
      </div>
    </details>
  );
}

function ReadonlyDevelopmentItemCard({ item, locale }: { item: ReadonlyDevelopmentItem; locale: Locale }) {
  const copy = developmentCopy[locale];
  const statusMeta = getDevelopmentStatusMeta(locale);
  const priorityMeta = getDevelopmentPriorityMeta(locale);
  const dateLocale = locale === "en" ? "en-US" : "zh-CN";
  const meta = statusMeta[item.status];
  return (
    <div className="rounded-xl border border-white/10 bg-white/6 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#E8EEF8]">{item.name}</h3>
          <p className="mt-2 text-xs text-[#8B95A7]">
            {priorityMeta[item.priority].label} · {copy.updatedAt.replace("{date}", item.updatedAt.toLocaleDateString(dateLocale))}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs ${meta.className}`}>{meta.label}</span>
      </div>
      {item.notes ? <p className="mt-3 text-sm leading-6 text-[#8B95A7]">{item.notes}</p> : null}
      {item.relatedFiles ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {splitRelatedFiles(item.relatedFiles).map((file) => (
            <code key={file} className="rounded-full border border-white/10 px-2 py-1 text-xs text-[#8B95A7]">{file}</code>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DevelopmentItemForm({ item, versionId, locale }: { item?: DevelopmentItem; versionId: string; locale: Locale }) {
  const copy = developmentCopy[locale];
  const statusMeta = getDevelopmentStatusMeta(locale);
  const priorityMeta = getDevelopmentPriorityMeta(locale);
  return (
    <form action={upsertDevelopmentItemAction} className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-2">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <input type="hidden" name="versionId" value={versionId} />
      <Field label={copy.module}><input name="module" required defaultValue={item?.module ?? ""} placeholder={copy.modulePlaceholder} className={inputClass} /></Field>
      <Field label={copy.featureName}><input name="name" required defaultValue={item?.name ?? ""} placeholder={copy.featurePlaceholder} className={inputClass} /></Field>
      <Field label={copy.status}>
        <select name="status" defaultValue={item?.status ?? "not_started"} className={selectClass}>
          {Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
        </select>
      </Field>
      <Field label={copy.priority}>
        <select name="priority" defaultValue={item?.priority ?? "medium"} className={selectClass}>
          {Object.entries(priorityMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
        </select>
      </Field>
      <Field label={copy.sortOrder}><input name="sortOrder" type="number" defaultValue={item?.sortOrder ?? 10} className={inputClass} /></Field>
      <Field label={copy.relatedFiles}><input name="relatedFiles" defaultValue={item?.relatedFiles ?? ""} placeholder="src/app/admin/orders/page.tsx" className={inputClass} /></Field>
      <Field label={copy.notes} className="md:col-span-2">
        <textarea name="notes" defaultValue={item?.notes ?? ""} className={textareaClass} />
      </Field>
      <div className="md:col-span-2"><SubmitButton>{item ? copy.saveItem : copy.createItem}</SubmitButton></div>
    </form>
  );
}

function formatDateInput(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function splitRelatedFiles(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const developmentCopy = {
  zh: {
    title: "开发进度驾驶舱",
    intro: "用于记录当前网站版本、功能完成状态、未完成模块、建议补强项和关联文件，让后续开发进度可以在后台直接维护。",
    deleted: "已删除对应开发进度记录。",
    currentVersion: "当前版本",
    completion: "整体完成度",
    totalItems: "总功能项",
    completed: "已完成",
    partial: "部分完成",
    todo: "待处理",
    developmentVersions: "开发版本",
    productVersions: "产品版本",
    toolVersions: "工具版本",
    itemCount: "{count} 项",
    deleteVersionTitle: "删除当前版本",
    deleteVersionIntro: "删除版本会同时删除该版本下的所有开发进度项。",
    deleteVersion: "删除版本",
    defaultSnapshot: "当前展示的是默认只读进度快照。右上方新增版本后，即可在数据库中维护版本和功能项。",
    editVersion: "编辑当前版本",
    newVersion: "新增开发版本",
    versionNo: "版本号",
    versionName: "版本名称",
    versionNamePlaceholder: "商业闭环版",
    status: "状态",
    sortOrder: "排序",
    startedAt: "开始日期",
    releasedAt: "发布日期",
    versionDescription: "版本说明",
    saveVersion: "保存版本",
    createVersion: "新增版本",
    updatedAt: "更新于 {date}",
    deleteItem: "删除功能项",
    module: "模块",
    modulePlaceholder: "订单 / 支付 / 付费下载",
    featureName: "功能名称",
    featurePlaceholder: "后台支付审核",
    priority: "优先级",
    relatedFiles: "关联文件",
    notes: "备注",
    saveItem: "保存功能项",
    createItem: "新增功能项"
  },
  en: {
    title: "Development dashboard",
    intro: "Track the current site version, feature status, unfinished modules, recommended improvements, and related files from the admin panel.",
    deleted: "Development progress record deleted.",
    currentVersion: "Current version",
    completion: "Completion",
    totalItems: "Total items",
    completed: "Completed",
    partial: "Partial",
    todo: "To handle",
    developmentVersions: "Development versions",
    productVersions: "Product versions",
    toolVersions: "Tool versions",
    itemCount: "{count} items",
    deleteVersionTitle: "Delete current version",
    deleteVersionIntro: "Deleting this version also deletes all development progress items under it.",
    deleteVersion: "Delete version",
    defaultSnapshot: "This is the default read-only progress snapshot. Create a version to maintain versions and feature items in the database.",
    editVersion: "Edit current version",
    newVersion: "New development version",
    versionNo: "Version",
    versionName: "Version name",
    versionNamePlaceholder: "Commercial loop edition",
    status: "Status",
    sortOrder: "Sort order",
    startedAt: "Start date",
    releasedAt: "Release date",
    versionDescription: "Version notes",
    saveVersion: "Save version",
    createVersion: "Create version",
    updatedAt: "Updated {date}",
    deleteItem: "Delete feature item",
    module: "Module",
    modulePlaceholder: "Orders / Payment / Paid downloads",
    featureName: "Feature name",
    featurePlaceholder: "Admin payment review",
    priority: "Priority",
    relatedFiles: "Related files",
    notes: "Notes",
    saveItem: "Save feature item",
    createItem: "Create feature item"
  }
} as const;

const developmentTranslations: Record<string, string> = {
  "商业闭环版": "Commercial loop edition",
  "基础页面": "Core pages",
  "首页与工具入口": "Homepage and tool entry points",
  "首页、AI软件应用、AI账号服务入口已具备。": "Homepage, AI software app, and AI account service entry points are in place.",
  "用户与权限": "Users and permissions",
  "注册登录与用户中心": "Registration, login, and account center",
  "已支持注册、登录、退出、用户中心和会话安全。": "Registration, login, logout, account center, and session security are supported.",
  "管理员后台权限": "Admin access control",
  "普通用户不能进入后台，管理员可访问后台菜单。": "Regular users cannot enter the admin panel; admins can access the admin menu.",
  "工具系统": "Tool system",
  "工具分类后台自定义": "Admin-customizable tool categories",
  "AI软件应用与AI账号服务分类由后台维护。": "AI software app and AI account service categories are maintained from the admin panel.",
  "AI软件应用管理": "AI software app management",
  "已支持清单、详情编辑、封面上传、下载文件绑定和上架检查。": "List view, detail editing, cover uploads, download file binding, and publish checks are supported.",
  "AI账号服务管理": "AI account service management",
  "已支持服务信息、服务价格和上架管理。": "Service details, service pricing, and publishing management are supported.",
  "工具详情页与教程": "Tool detail pages and tutorials",
  "详情页已展示教程、截图、评论和相关推荐；教程支持注意事项与常见错误。": "Detail pages show tutorials, screenshots, comments, and related recommendations; tutorials support notes and common errors.",
  "付费下载与订单": "Paid downloads and orders",
  "套餐功能停用": "Plan feature disabled",
  "统一套餐入口已下线，收费软件改为按工具单独购买。": "Plan entry points are offline. Paid software is purchased per tool.",
  "订单创建与取消": "Order creation and cancellation",
  "用户可创建订单，并可取消允许取消状态的订单。": "Users can create orders and cancel orders in cancellable states.",
  "个人收款码支付页": "Personal QR payment page",
  "支付页已展示支付宝和微信收款码，并提示备注订单号。": "The payment page shows Alipay and WeChat QR codes and reminds users to remark the order number.",
  "付款截图上传与预览": "Payment proof upload and preview",
  "上传后进入订单详情并展示付款凭证预览。": "After upload, users are sent to order details with payment proof preview.",
  "后台支付审核自动开通权益": "Admin payment review activates benefits",
  "后台支付审核自动开通软件权益": "Payment review activates software access",
  "审核通过后创建对应工具的软件购买权益。": "Approval creates the software purchase entitlement for the related tool.",
  "权限控制": "Access control",
  "收费软件下载权限": "Paid software download access",
  "下载权限在服务端校验。": "Download access is checked server-side.",
  "AI账号服务使用记录": "AI account service usage records",
  "AI账号服务入口在服务端校验权限并记录使用日志。": "AI account service launch is checked server-side and usage is logged.",
  "内容互动": "Content interaction",
  "用户评论与后台审核": "User comments and admin review",
  "评论需后台审核，支持置顶和删除。": "Comments require admin review and support pinning and deletion.",
  "文件与存储": "Files and storage",
  "文件上传与 COS 闭环": "File upload and COS workflow",
  "已支持本地上传、COS 环境变量自动切换、配置体检、远程对象删除和失败提示。": "Local uploads, COS auto-switching by environment variables, config checks, remote object deletion, and failure messages are supported.",
  "售后与通知": "After-sales and notifications",
  "退款/售后记录": "Refund and after-sales records",
  "用户可申请售后/退款，后台可处理并记录。": "Users can request after-sales/refunds, and admins can process and record them.",
  "站内通知": "Notifications",
  "支付审核和退款处理会通知用户。": "Payment review and refund handling notify users.",
  "部署运维": "Deployment and operations",
  "Docker 与腾讯云部署配置": "Docker and Tencent Cloud deployment",
  "已拆分独立部署文件，避免影响旧项目端口。": "Deployment files are isolated to avoid affecting old project ports.",
  "安全与质量": "Security and quality",
  "关键流程测试": "Critical flow tests",
  "核心单元测试和商业闭环 E2E 已存在；后续可补更多管理端浏览器回归。": "Core unit tests and commercial-loop E2E exist; more admin browser regressions can be added later.",
  "运营后台": "Operations admin",
  "管理员消息中心": "Admin message center",
  "已集中展示待审核付款、退款申请和上传异常。": "Pending payments, refund requests, and upload issues are centralized.",
  "产品发布版本管理": "Product release management",
  "已打通开发版本、产品版本、工具版本三层记录。": "Development, product, and tool versions are connected as three record layers."
};

function localizeDevelopmentItems<T extends ReadonlyDevelopmentItem | DevelopmentItem>(items: T[], locale: Locale): T[] {
  if (locale === "zh") return items;
  return items.map((item) => ({
    ...item,
    module: localizeDevelopmentValue(item.module, locale),
    name: localizeDevelopmentValue(item.name, locale),
    notes: item.notes ? localizeDevelopmentValue(item.notes, locale) : item.notes
  }));
}

function localizeDevelopmentValue(value: string, locale: Locale) {
  if (locale === "zh") return value;
  return developmentTranslations[value] ?? value;
}
