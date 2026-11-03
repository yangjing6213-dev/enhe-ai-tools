import Link from "next/link";
import type { DevelopmentItem, DevelopmentVersion } from "@prisma/client";
import {
  deleteDevelopmentItemAction,
  deleteDevelopmentVersionAction,
  upsertDevelopmentItemAction,
  upsertDevelopmentVersionAction
} from "@/app/admin/actions";
import { AdminSection, Field, inputClass, selectClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";
import { HoldDeleteForm } from "@/components/hold-delete-form";
import { prisma } from "@/lib/db";
import {
  calculateDevelopmentSummary,
  getDevelopmentPriorityMeta,
  getDevelopmentStatusMeta,
  getDevelopmentVersionStatusMeta,
  groupDevelopmentItemsByModule
} from "@/lib/development-progress";
import { getCurrentLocale, type Locale } from "@/lib/i18n";

type VersionWithItems = DevelopmentVersion & { items: DevelopmentItem[] };

export default async function AdminDevelopmentPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const locale = await getCurrentLocale();
  const copy = developmentCopy[locale];
  const versionStatusMeta = getDevelopmentVersionStatusMeta(locale);
  const versions = await prisma.developmentVersion.findMany({
    include: {
      items: {
        orderBy: [{ module: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      }
    },
    orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }]
  });
  const selectedVersion = versions.find((version) => version.id === params.version) ?? versions.find((version) => version.status === "active") ?? versions[0];
  const items = selectedVersion?.items ?? [];
  const summary = calculateDevelopmentSummary(items);
  const groupedItems = groupDevelopmentItemsByModule(items);

  return (
    <AdminSection title={copy.title} intro={copy.intro}>
      {params.deleted ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">
          {copy.deleted}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="glass rounded-2xl p-6">
          {selectedVersion ? (
            <>
              <p className="text-sm text-[#48F5D3]">{copy.currentVersion} · {versionStatusMeta[selectedVersion.status]}</p>
              <h2 className="mt-2 text-3xl font-semibold">{selectedVersion.version} · {localizeDevelopmentValue(selectedVersion.name, locale)}</h2>
              {selectedVersion.description ? (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8B95A7]">{localizeDevelopmentValue(selectedVersion.description, locale)}</p>
              ) : null}
              {items.length ? (
                <>
                  <div className="mt-8 grid gap-4 md:grid-cols-5">
                    <ProgressStat label={copy.completion} value={`${summary.completionPercent}%`} accent />
                    <ProgressStat label={copy.totalItems} value={summary.total} />
                    <ProgressStat label={copy.completed} value={summary.completed} />
                    <ProgressStat label={copy.partial} value={summary.partial} />
                    <ProgressStat label={copy.todo} value={summary.notStarted + summary.recommended} />
                  </div>
                  <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/8" aria-hidden="true">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#48F5D3] via-[#7AA7FF] to-[#A78BFA]" style={{ width: `${summary.completionPercent}%` }} />
                  </div>
                </>
              ) : <p className="mt-4 text-sm leading-6">{copy.noItems}</p>}
              <div className="mt-6 flex flex-wrap gap-2">
                {versions.map((version) => (
                  <Link key={version.id} href={`/admin/development?version=${version.id}`}
                    aria-current={selectedVersion.id === version.id ? "page" : undefined}
                    className={`rounded-full border px-3 py-1 text-xs transition ${selectedVersion.id === version.id
                      ? "border-[#48F5D3]/50 bg-[#48F5D3]/10 text-[#48F5D3]"
                      : "border-white/10 text-[#8B95A7] hover:border-[#48F5D3]/40 hover:text-[#48F5D3]"}`}
                  >{version.version}</Link>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold">{copy.noVersions}</h2>
              <p className="mt-3 text-sm leading-6">{copy.createFirstVersion}</p>
            </>
          )}
        </section>

        <div className="space-y-4">
          <VersionForm version={selectedVersion ?? null} locale={locale} />
          {selectedVersion ? (
            <details className="glass rounded-2xl p-4">
              <summary className="cursor-pointer font-semibold">{copy.newVersion}</summary>
              <VersionForm version={null} locale={locale} />
            </details>
          ) : null}
        </div>
      </div>

      {selectedVersion ? (
        <div className="enhe-admin-card-grid mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {groupedItems.map((group) => (
              <section key={group.module} className="glass rounded-2xl p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">{localizeDevelopmentValue(group.module, locale)}</h2>
                  <span className="text-xs text-[#8B95A7]">{copy.itemCount.replace("{count}", String(group.items.length))}</span>
                </div>
                <div className="space-y-4">
                  {group.items.map((item) => (
                    <DevelopmentItemCard key={item.id} item={item} versionId={selectedVersion.id} locale={locale} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="space-y-6">
            <DevelopmentItemForm versionId={selectedVersion.id} locale={locale} />
            <HoldDeleteForm action={deleteDevelopmentVersionAction} label={copy.deleteVersion} locale={locale} className="glass rounded-2xl border border-red-400/20 p-6" buttonClassName="mt-5">
              <input type="hidden" name="id" value={selectedVersion.id} />
              <h2 className="text-xl font-semibold text-red-100">{copy.deleteVersionTitle}</h2>
              <p className="mt-3 text-sm leading-6 text-[#8B95A7]">{copy.deleteVersionIntro}</p>
            </HoldDeleteForm>
          </div>
        </div>
      ) : null}
    </AdminSection>
  );
}

function ProgressStat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="enhe-admin-card rounded-xl border border-white/10 bg-white/6 p-4">
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
            <h3 className="font-semibold text-[#E8EEF8]">{localizeDevelopmentValue(item.name, locale)}</h3>
            <p className="mt-2 text-xs text-[#8B95A7]">
              {priorityMeta[item.priority].label} · {copy.updatedAt.replace("{date}", item.updatedAt.toLocaleDateString(dateLocale))}
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs ${meta.className}`}>{meta.label}</span>
        </div>
        {item.notes ? <p className="mt-3 text-sm leading-6 text-[#8B95A7]">{localizeDevelopmentValue(item.notes, locale)}</p> : null}
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
        <HoldDeleteForm action={deleteDevelopmentItemAction} label={copy.deleteItem} locale={locale} className="mt-4">
          <input type="hidden" name="id" value={item.id} />
        </HoldDeleteForm>
      </div>
    </details>
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
    title: "开发进度",
    intro: "按开发版本维护功能项、人工填写的状态和关联文件。完成度按当前所选版本中已记录的功能项计算。",
    deleted: "已删除对应开发进度记录。",
    currentVersion: "所选开发版本",
    completion: "本版完成度",
    totalItems: "总功能项",
    completed: "已完成",
    partial: "部分完成",
    todo: "待处理",
    itemCount: "{count} 项",
    deleteVersionTitle: "删除当前版本",
    deleteVersionIntro: "删除版本会同时删除该版本下的所有开发进度项。",
    deleteVersion: "删除版本",
    noVersions: "暂无开发版本",
    createFirstVersion: "先创建一个开发版本，再添加需要跟踪的功能项。",
    noItems: "此版本还没有功能项。添加后即可查看完成度。",
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
    title: "Development progress",
    intro: "Track features, manually recorded status and related files by development version. Completion is calculated from the items recorded for the selected version.",
    deleted: "Development progress record deleted.",
    currentVersion: "Selected development version",
    completion: "Completion",
    totalItems: "Total items",
    completed: "Completed",
    partial: "Partial",
    todo: "To handle",
    itemCount: "{count} items",
    deleteVersionTitle: "Delete current version",
    deleteVersionIntro: "Deleting this version also deletes all development progress items under it.",
    deleteVersion: "Delete version",
    noVersions: "No development versions yet",
    createFirstVersion: "Create a development version, then add the features you want to track.",
    noItems: "Add the first feature to this version to see its progress.",
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

function localizeDevelopmentValue(value: string, locale: Locale) {
  if (locale === "zh") return value;
  return developmentTranslations[value] ?? value;
}
