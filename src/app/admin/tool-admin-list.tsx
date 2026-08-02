import Link from "next/link";
import Image from "next/image";
import { deleteToolAction, upsertToolAction } from "@/app/admin/actions";
import { DangerButton, Field, inputClass, selectClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";
import { ToolMediaUploadGuard } from "@/app/admin/tool-media-upload-guard";
import { ToolProductImageManager } from "@/app/admin/tool-product-image-manager";
import { ToolVideoUploadField } from "@/app/admin/tool-video-upload-field";
import { AiSkillPackageUploadField } from "@/app/admin/ai-skill-package-upload-field";
import { supportedAiAgentOptions } from "@/lib/ai-skill";
import { getAdminToolBasePath, getAdminToolEditPath, getAdminToolNewPath } from "@/lib/admin-tool-routes";
import { decideAdminToolHardDelete } from "@/lib/admin-delete-protection";
import type { Locale } from "@/lib/i18n";
import { resolveToolImageSrc } from "@/lib/tool-image";
import { getPrimaryToolPrice, type ToolPriceSpecStatus } from "@/lib/tool-price-specs";
import { getToolPublishIssues } from "@/lib/tool-publish-check";

type AdminToolType = "software" | "online" | "skill_learning" | "ai_skill";

type ToolItem = {
  id: string;
  name: string;
  englishName: string | null;
  slug: string;
  type: AdminToolType;
  status: string;
  sortOrder: number;
  shortDescription: string;
  content: string;
  coverImage: string | null;
  screenshots: string[];
  videoUrl: string | null;
  videoTitle: string | null;
  videoDescription: string | null;
  videoUrl2: string | null;
  videoTitle2: string | null;
  videoDescription2: string | null;
  videoUrl3: string | null;
  videoTitle3: string | null;
  videoDescription3: string | null;
  version: string | null;
  systemRequirement: string | null;
  supportedAgents: string[];
  isVipRequired: boolean;
  isDownloadPaid: boolean;
  isDownloadLinkVipOnly: boolean;
  isHomeRecommended: boolean;
  downloadPrice: unknown;
  onlineUrl: string | null;
  downloadFileId: string | null;
  downloadFile?: { fileName: string; filePath: string; fileUrl: string | null; fileSize: bigint | null } | null;
  priceSpecs?: ToolPriceSpecItem[];
  categoryId: string | null;
  category?: { name: string } | null;
  _count?: { orders: number; purchases: number };
};

type ToolCategoryItem = { id: string; name: string; type: string };
type ToolPriceSpecItem = { id: string; name: string; price: unknown; sortOrder: number; status: ToolPriceSpecStatus; _count?: { orders: number; purchases: number } };
type Notice = Record<string, string | undefined>;
type ToolListFilters = { q: string; status?: string; categoryId?: string; page: number };

const statusTextZh: Record<string, string> = {
  draft: "草稿",
  published: "发布",
  offline: "下架"
};

const statusTextEn: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  offline: "Offline"
};

const statusClass: Record<string, string> = {
  draft: "border-white/15 bg-white/8 text-[#8B95A7]",
  published: "border-[var(--marketing-accent)]/35 bg-[var(--marketing-accent)]/12 text-[#d8f8ff]",
  offline: "border-amber-300/30 bg-amber-300/10 text-amber-100"
};

function NoticeBar({ notice, locale }: { notice?: Notice; locale: Locale }) {
  const copy = toolAdminCopy[locale];
  if (notice?.saved) {
    return <p className="status-success mt-4">{copy.saved}</p>;
  }
  if (notice?.deleted) {
    return <p className="status-success mt-4">{copy.deleted}</p>;
  }
  if (notice?.error) {
    return <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{copy.failed}: {notice.error}</p>;
  }
  return null;
}

function formatPrice(price: unknown) {
  const value = Number(price ?? 0);
  return Number.isFinite(value) ? `¥${value.toFixed(2)}` : "¥0.00";
}

function getDirectDownloadUrl(tool?: ToolItem) {
  const file = tool?.downloadFile;
  if (!file?.fileUrl) return "";
  return file.filePath === file.fileUrl ? file.fileUrl : "";
}

function getToolDisplayPrice(tool: ToolItem) {
  return getPrimaryToolPrice(tool.priceSpecs ?? [], tool.downloadPrice);
}

function hasToolPrice(tool: ToolItem) {
  return getToolDisplayPrice(tool) > 0;
}

function buildEditorPriceSpecRows(tool?: ToolItem) {
  const existing = [...(tool?.priceSpecs ?? [])].sort((left, right) => left.sortOrder - right.sortOrder);
  const legacyRows = !existing.length && Number(tool?.downloadPrice ?? 0) > 0
    ? [{
        id: "",
        name: tool?.type === "online" ? "默认服务" : "默认授权",
        price: tool?.downloadPrice ?? 0,
        sortOrder: 0,
        status: "active" as ToolPriceSpecStatus
      }]
    : [];
  const rows = [...existing, ...legacyRows].map((spec, index) => ({
    id: spec.id,
    name: spec.name,
    price: spec.price,
    sortOrder: spec.sortOrder ?? index,
    status: spec.status
  }));
  while (rows.length < 4) {
    rows.push({ id: "", name: "", price: "", sortOrder: rows.length, status: "disabled" as ToolPriceSpecStatus });
  }
  return rows.slice(0, 20);
}

function Badge({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <span className={`rounded-full border px-3 py-1 text-xs ${className}`}>{children}</span>;
}

export function ToolAdminList({
  title,
  type,
  locale = "zh",
  tools,
  notice,
  categories = [],
  filters,
  total,
  pageCount,
  buildPageHref
}: {
  title: string;
  type: AdminToolType;
  locale?: Locale;
  tools: ToolItem[];
  notice?: Notice;
  categories?: ToolCategoryItem[];
  filters?: ToolListFilters;
  total?: number;
  pageCount?: number;
  buildPageHref?: (page: number) => string;
}) {
  const copy = toolAdminCopy[locale];
  const statusText = locale === "en" ? statusTextEn : statusTextZh;
  const listPath = getAdminToolBasePath(type);
  const matchingCategories = categories.filter((category) => category.type === type);
  const isAccountService = type === "online";
  const isSkillLearning = type === "skill_learning";
  const isAiSkill = type === "ai_skill";

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8B95A7]">
            {isAiSkill ? copy.aiSkillListIntro : isSkillLearning ? copy.courseListIntro : isAccountService ? copy.serviceListIntro : copy.listIntro}
          </p>
        </div>
        <Link href={getAdminToolNewPath(type)} className="rounded-full bg-[var(--marketing-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#56bfd0]">
          {isAiSkill ? copy.newAiSkill : isSkillLearning ? copy.newCourse : isAccountService ? copy.newService : copy.newTool}
        </Link>
      </div>

      <NoticeBar notice={notice} locale={locale} />

      {filters && buildPageHref ? (
        <>
          <form className="filter-surface mt-6 grid gap-3 md:grid-cols-[1fr_180px_220px_auto]" action={listPath}>
            <input name="q" defaultValue={filters.q} placeholder={isSkillLearning ? copy.courseSearchPlaceholder : isAccountService ? copy.serviceSearchPlaceholder : copy.searchPlaceholder} className={inputClass} />
            <select name="status" defaultValue={filters.status ?? ""} className={selectClass}>
              <option value="">{copy.allStatus}</option>
              <option value="draft">{statusText.draft}</option>
              <option value="published">{statusText.published}</option>
              <option value="offline">{statusText.offline}</option>
            </select>
            <select name="categoryId" defaultValue={filters.categoryId ?? ""} className={selectClass}>
              <option value="">{copy.allCategories}</option>
              {matchingCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <button className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-[#E8EEF8]">{copy.filter}</button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[#8B95A7]">
            <span>{copy.pagination.replace("{total}", String(total ?? tools.length)).replace("{page}", String(filters.page)).replace("{pageCount}", String(pageCount ?? 1))}</span>
            <div className="flex gap-2">
              <Link
                href={buildPageHref(filters.page - 1)}
                aria-disabled={filters.page <= 1}
                className={`rounded-full border border-white/12 px-4 py-2 ${filters.page <= 1 ? "pointer-events-none opacity-40" : ""}`}
              >
                {copy.prev}
              </Link>
              <Link
                href={buildPageHref(filters.page + 1)}
                aria-disabled={filters.page >= (pageCount ?? 1)}
                className={`rounded-full border border-white/12 px-4 py-2 ${filters.page >= (pageCount ?? 1) ? "pointer-events-none opacity-40" : ""}`}
              >
                {copy.next}
              </Link>
            </div>
          </div>
        </>
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-2xl border border-white/12 bg-white/6">
        <div className="grid min-w-[1080px] grid-cols-[1.4fr_0.8fr_0.6fr_0.8fr_1.1fr_0.6fr] gap-4 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-wide text-[#8B95A7]">
          <span>{isSkillLearning ? copy.course : isAccountService ? copy.service : copy.tool}</span>
          <span>{copy.category}</span>
          <span>{copy.status}</span>
          <span>{isSkillLearning ? copy.coursePrice : isAccountService ? copy.servicePrice : copy.accessPrice}</span>
          <span>{copy.publishCheck}</span>
          <span className="text-right">{copy.actions}</span>
        </div>

        {tools.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#8B95A7]">{isSkillLearning ? copy.noCourses : isAccountService ? copy.noServices : copy.noTools}</div>
        ) : (
          <div className="min-w-[1080px] divide-y divide-white/10">
            {tools.map((tool) => {
              const publishIssues = getToolPublishIssues(tool);
              const coverImage = resolveToolImageSrc(tool.coverImage);
              const displayPrice = getToolDisplayPrice(tool);

              return (
                <div key={tool.id} className="grid grid-cols-[1.4fr_0.8fr_0.6fr_0.8fr_1.1fr_0.6fr] items-center gap-4 px-5 py-4 text-sm transition hover:bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#0B1220]">
                      {coverImage ? (
                        <Image src={coverImage} alt={tool.name} fill className="object-cover" sizes="96px" unoptimized />
                      ) : (
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(65,197,219,0.22),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent)]" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-[#E8EEF8]">{tool.name}</p>
                      {tool.englishName ? <p className="mt-1 text-xs font-medium text-[var(--marketing-accent)]">{tool.englishName}</p> : null}
                      <p className="mt-1 text-xs text-[#8B95A7]">{tool.slug}</p>
                    </div>
                  </div>
                  <div className="text-[#C5D0E2]">{tool.category?.name ?? copy.uncategorized}</div>
                  <div>
                    <Badge className={statusClass[tool.status] ?? statusClass.draft}>{statusText[tool.status] ?? tool.status}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-center">
                    {hasToolPrice(tool) ? (
                      <Badge className="border-[#FFB86B]/40 bg-[#FFB86B]/10 text-[#FFB86B]">{formatPrice(displayPrice)}</Badge>
                    ) : (
                      <Badge className="border-white/15 bg-white/8 text-[#C5D0E2]">{copy.free}</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-center">
                    {publishIssues.length ? (
                      <>
                        {publishIssues.slice(0, 3).map((issue) => (
                          <Badge key={issue} className="border-[#FFB86B]/30 bg-[#FFB86B]/10 text-[#FFB86B]">{localizePublishIssue(issue, locale)}</Badge>
                        ))}
                        {publishIssues.length > 3 ? <Badge className="border-white/15 bg-white/8 text-[#8B95A7]">+{publishIssues.length - 3}</Badge> : null}
                      </>
                    ) : (
                      <Badge className="border-[var(--marketing-accent)]/35 bg-[var(--marketing-accent)]/12 text-[#d8f8ff]">{copy.publishable}</Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <Link href={getAdminToolEditPath(type, tool.id)} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-[#E8EEF8] transition hover:border-[var(--marketing-accent)]/50 hover:text-[var(--marketing-accent)]">
                      {copy.viewEdit}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function ToolEditor({
  title,
  type,
  locale = "zh",
  tool,
  categories,
  notice
}: {
  title: string;
  type: AdminToolType;
  locale?: Locale;
  tool?: ToolItem;
  categories: ToolCategoryItem[];
  notice?: Notice;
}) {
  const copy = toolAdminCopy[locale];
  const statusText = locale === "en" ? statusTextEn : statusTextZh;
  const editorPath = getAdminToolEditPath(type, tool?.id ?? "new");
  const listPath = getAdminToolBasePath(type);
  const matchingCategories = categories.filter((category) => category.type === type);
  const directDownloadUrl = getDirectDownloadUrl(tool);
  const isAccountService = type === "online";
  const isSkillLearning = type === "skill_learning";
  const isAiSkill = type === "ai_skill";
  const priceSpecRows = buildEditorPriceSpecRows(tool);
  const priceSpecProtectedCounts = (tool?.priceSpecs ?? []).reduce(
    (counts, priceSpec) => ({
      orders: counts.orders + (priceSpec._count?.orders ?? 0),
      purchases: counts.purchases + (priceSpec._count?.purchases ?? 0),
    }),
    { orders: 0, purchases: 0 },
  );
  const deleteDecision = tool
    ? decideAdminToolHardDelete({
        orders: (tool._count?.orders ?? 0) + priceSpecProtectedCounts.orders,
        purchases: (tool._count?.purchases ?? 0) + priceSpecProtectedCounts.purchases,
      })
    : null;

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8B95A7]">
            {isAiSkill ? copy.aiSkillEditorIntro : isSkillLearning ? copy.courseEditorIntro : isAccountService ? copy.serviceEditorIntro : copy.editorIntro}
          </p>
        </div>
        <Link href={listPath} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-[#E8EEF8] transition hover:border-[var(--marketing-accent)]/50 hover:text-[var(--marketing-accent)]">
          {copy.backToList}
        </Link>
      </div>

      <NoticeBar notice={notice} locale={locale} />

      <form action={upsertToolAction} className="mt-8 grid gap-6">
        {tool ? <input type="hidden" name="id" value={tool.id} /> : null}
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="returnTo" value={editorPath} />
        <input type="hidden" name="coverImage" value={tool?.coverImage ?? ""} />
        {!isAiSkill ? <input type="hidden" name="downloadFileId" value={tool?.downloadFileId ?? ""} /> : null}
        <input type="hidden" name="downloadPrice" value="0" />

        <EditorSection title={copy.basicSection} intro={isAccountService ? copy.basicServiceIntro : isSkillLearning ? copy.basicCourseIntro : copy.basicToolIntro}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={isSkillLearning ? copy.courseName : isAccountService ? copy.serviceName : copy.toolName}>
              <input name="name" required defaultValue={tool?.name ?? ""} className={inputClass} />
            </Field>
            <Field label={copy.englishName}>
              <input name="englishName" defaultValue={tool?.englishName ?? ""} placeholder={copy.englishNamePlaceholder} className={inputClass} />
            </Field>
            <Field label="Slug">
              <input name="slug" defaultValue={tool?.slug ?? ""} placeholder={copy.slugPlaceholder} className={inputClass} />
            </Field>
            <Field label={copy.category}>
              <select name="categoryId" defaultValue={tool?.categoryId ?? ""} className={selectClass}>
                <option value="">{copy.uncategorized}</option>
                {matchingCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </Field>
            <Field label={copy.status}>
              <select name="status" defaultValue={tool?.status ?? "draft"} className={selectClass}>
                <option value="draft">{statusText.draft}</option>
                <option value="published">{statusText.published}</option>
                <option value="offline">{statusText.offline}</option>
              </select>
            </Field>
            <Field label={copy.sortOrder}>
              <input name="sortOrder" type="number" defaultValue={tool?.sortOrder ?? 0} className={inputClass} />
            </Field>
          </div>
        </EditorSection>

        <EditorSection title={copy.displaySection} intro={copy.displaySectionIntro}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-[#F6FAFF]">
              <input name="isHomeRecommended" type="checkbox" defaultChecked={tool?.isHomeRecommended ?? false} /> {copy.homeRecommended}
            </label>
            <Field label={copy.coverUpload}>
              <ToolMediaUploadGuard name="coverImageFile" inputClass={inputClass} />
              <span className="mt-2 block text-xs leading-5 text-[#8B95A7]">
                {copy.coverHint}
              </span>
            </Field>
            {!isAccountService && !isSkillLearning ? (
              <>
                <Field label={copy.version}>
                  <input name="version" defaultValue={tool?.version ?? ""} className={inputClass} />
                </Field>
                <Field label={copy.systemRequirement}>
                  <input name="systemRequirement" defaultValue={tool?.systemRequirement ?? ""} className={inputClass} />
                </Field>
              </>
            ) : null}
            {isAiSkill ? (
              <fieldset className="md:col-span-2 rounded-2xl border border-white/10 bg-white/6 p-4">
                <legend className="px-1 text-sm font-semibold text-[#F6FAFF]">{copy.supportedAgents}</legend>
                <p className="mt-1 text-xs leading-5 text-[#8B95A7]">{copy.supportedAgentsHint}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {supportedAiAgentOptions.map((agent) => (
                    <label key={agent} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-[#F6FAFF]">
                      <input name="supportedAgents" type="checkbox" value={agent} defaultChecked={tool?.supportedAgents.includes(agent) ?? false} />
                      {agent}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
          </div>
        </EditorSection>

        <EditorSection title={copy.priceSpecSection} intro={isAccountService ? copy.servicePriceSpecIntro : copy.softwarePriceSpecIntro}>
          <input type="hidden" name="priceSpecRowCount" value={priceSpecRows.length} />
          <div className="grid gap-3">
            {priceSpecRows.map((spec, index) => (
              <div key={spec.id || `blank-${index}`} className="grid gap-3 rounded-2xl border border-white/10 bg-white/6 p-4 md:grid-cols-[1.1fr_0.8fr_0.55fr_auto]">
                <input type="hidden" name={`priceSpecId_${index}`} value={spec.id} />
                <Field label={copy.priceSpecName}>
                  <input name={`priceSpecName_${index}`} defaultValue={spec.name} placeholder={index === 0 ? copy.priceSpecNamePlaceholderA : copy.priceSpecNamePlaceholderB} className={inputClass} />
                </Field>
                <Field label={copy.purchasePrice}>
                  <input name={`priceSpecPrice_${index}`} type="number" step="0.01" min="0" defaultValue={spec.price != null ? String(spec.price) : ""} placeholder="9.90" className={inputClass} />
                </Field>
                <Field label={copy.priceSpecSortOrder}>
                  <input name={`priceSpecSortOrder_${index}`} type="number" defaultValue={spec.sortOrder} className={inputClass} />
                </Field>
                <label className="flex items-center gap-2 self-end rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-[#F6FAFF]">
                  <input name={`priceSpecActive_${index}`} type="checkbox" defaultChecked={spec.status === "active"} /> {copy.priceSpecActive}
                </label>
              </div>
            ))}
          </div>
        </EditorSection>

        <EditorSection title={copy.detailSection} intro={copy.detailSectionIntro}>
          <div className="grid gap-4">
            <Field label={copy.shortDescription}>
              <textarea name="shortDescription" required defaultValue={tool?.shortDescription ?? ""} className={textareaClass} />
            </Field>
            <Field label={copy.content}>
              <textarea name="content" required defaultValue={tool?.content ?? ""} className={textareaClass} />
            </Field>
            <div>
              <p className="mb-2 block text-sm text-[#F6FAFF]">{copy.productVideo}</p>
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <div className="grid gap-5">
                  <div className="rounded-2xl border border-white/10 bg-[#07101E]/55 p-4">
                    <p className="mb-3 text-sm font-semibold text-[#F6FAFF]">{copy.productVideo} 1</p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label={`${copy.productVideoUrl} / ${copy.productVideoUpload} 1`}>
                        <ToolVideoUploadField
                          urlName="videoUrl"
                          currentUrl={tool?.videoUrl}
                          inputClass={inputClass}
                          toolSlug={tool?.slug}
                          uploadLabel={`${copy.productVideoUpload} 1`}
                        />
                      </Field>
                      <Field label={`${copy.productVideoTitle} 1`}>
                        <input name="videoTitle" defaultValue={tool?.videoTitle ?? ""} placeholder={copy.productVideoTitlePlaceholder} className={inputClass} />
                      </Field>
                      <Field label={`${copy.productVideoDescription} 1`}>
                        <textarea name="videoDescription" defaultValue={tool?.videoDescription ?? ""} placeholder={copy.productVideoDescriptionPlaceholder} className={textareaClass} />
                      </Field>
                    </div>
                    {tool?.videoUrl ? (
                      <p className="mt-4 break-all rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-[#C5D0E2]">
                        {copy.currentProductVideo} 1: {tool.videoUrl}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#07101E]/55 p-4">
                    <p className="mb-3 text-sm font-semibold text-[#F6FAFF]">{copy.productVideo} 2</p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label={`${copy.productVideoUrl} / ${copy.productVideoUpload} 2`}>
                        <ToolVideoUploadField
                          urlName="videoUrl2"
                          currentUrl={tool?.videoUrl2}
                          inputClass={inputClass}
                          toolSlug={tool?.slug}
                          uploadLabel={`${copy.productVideoUpload} 2`}
                        />
                      </Field>
                      <Field label={`${copy.productVideoTitle} 2`}>
                        <input name="videoTitle2" defaultValue={tool?.videoTitle2 ?? ""} placeholder={copy.productVideoTitlePlaceholder} className={inputClass} />
                      </Field>
                      <Field label={`${copy.productVideoDescription} 2`}>
                        <textarea name="videoDescription2" defaultValue={tool?.videoDescription2 ?? ""} placeholder={copy.productVideoDescriptionPlaceholder} className={textareaClass} />
                      </Field>
                    </div>
                    {tool?.videoUrl2 ? (
                      <p className="mt-4 break-all rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-[#C5D0E2]">
                        {copy.currentProductVideo} 2: {tool.videoUrl2}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#07101E]/55 p-4">
                    <p className="mb-3 text-sm font-semibold text-[#F6FAFF]">{copy.productVideo} 3</p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label={`${copy.productVideoUrl} / ${copy.productVideoUpload} 3`}>
                        <ToolVideoUploadField
                          urlName="videoUrl3"
                          currentUrl={tool?.videoUrl3}
                          inputClass={inputClass}
                          toolSlug={tool?.slug}
                          uploadLabel={`${copy.productVideoUpload} 3`}
                        />
                      </Field>
                      <Field label={`${copy.productVideoTitle} 3`}>
                        <input name="videoTitle3" defaultValue={tool?.videoTitle3 ?? ""} placeholder={copy.productVideoTitlePlaceholder} className={inputClass} />
                      </Field>
                      <Field label={`${copy.productVideoDescription} 3`}>
                        <textarea name="videoDescription3" defaultValue={tool?.videoDescription3 ?? ""} placeholder={copy.productVideoDescriptionPlaceholder} className={textareaClass} />
                      </Field>
                    </div>
                    {tool?.videoUrl3 ? (
                      <p className="mt-4 break-all rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-[#C5D0E2]">
                        {copy.currentProductVideo} 3: {tool.videoUrl3}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#8B95A7]">{copy.productVideoHint}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 block text-sm text-[#F6FAFF]">{copy.productImages}</p>
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <ToolMediaUploadGuard name="screenshotFiles" inputClass={inputClass} multiple />
                <p className="mt-2 text-xs leading-5 text-[#8B95A7]">{copy.productImagesHint}</p>
                {tool?.screenshots.length ? (
                  <ToolProductImageManager
                    screenshots={tool.screenshots}
                    copy={{
                      productImageAlt: copy.productImageAlt,
                      keepProductImage: copy.keepProductImage,
                      productImagePosition: copy.productImagePosition,
                      productImageMoveUp: copy.productImageMoveUp,
                      productImageMoveDown: copy.productImageMoveDown,
                      productImageRemoved: copy.productImageRemoved
                    }}
                  />
                ) : (
                  <p className="mt-4 rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-[#8B95A7]">{copy.noProductImages}</p>
                )}
              </div>
            </div>
            {isSkillLearning ? (
              <div className="surface-panel-soft p-5">
                <p className="text-sm font-semibold text-[#F6FAFF]">{copy.courseContentSectionTitle}</p>
                <p className="mt-2 text-sm leading-6 text-[#8B95A7]">{copy.courseContentSectionIntro}</p>
                {tool?.id ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a href={`/admin/tutorials?toolId=${tool.id}`} className="inline-block rounded-full bg-[var(--marketing-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#56bfd0]">{copy.manageTutorials}</a>
                    <a href={`/admin/faqs?toolId=${tool.id}`} className="inline-block rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-[#E8EEF8] transition hover:border-[var(--marketing-accent)]/50 hover:text-[var(--marketing-accent)]">{copy.manageFaq}</a>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[#FFB86B]">{copy.saveBeforeContent}</p>
                )}
              </div>
            ) : isAiSkill ? (
              <AiSkillPackageUploadField
                currentFileId={tool?.downloadFileId}
                currentFileName={tool?.downloadFile?.fileName}
                labels={{
                  title: copy.aiSkillPackage,
                  hint: copy.aiSkillPackageHint,
                  choose: copy.aiSkillPackageChoose,
                  uploading: copy.aiSkillPackageUploading,
                  uploaded: copy.aiSkillPackageUploaded,
                  remove: copy.aiSkillPackageRemove,
                  failed: copy.aiSkillPackageFailed,
                }}
              />
            ) : !isAccountService ? (
              <Field label={copy.downloadFileUrl}>
                <textarea
                  name="downloadFileUrl"
                  defaultValue={directDownloadUrl}
                  placeholder={copy.downloadFileUrlPlaceholder}
                  className={textareaClass}
                />
                <span className="mt-2 block text-xs leading-5 text-[#8B95A7]">
                  {copy.downloadFileUrlHint}
                </span>
              </Field>
            ) : null}
          </div>
        </EditorSection>

        <div>
          <SubmitButton>
            {tool
              ? (isSkillLearning ? copy.saveCourse : isAccountService ? copy.saveService : copy.saveTool)
              : (isSkillLearning ? copy.createCourse : isAccountService ? copy.createService : copy.createTool)}
          </SubmitButton>
        </div>
      </form>

      {tool && deleteDecision?.allowed ? (
        <form action={deleteToolAction} className="mt-4">
          <input type="hidden" name="id" value={tool.id} />
          <input type="hidden" name="type" value={type} />
          <DangerButton>{isSkillLearning ? copy.deleteCourse : isAccountService ? copy.deleteService : copy.deleteTool}</DangerButton>
        </form>
      ) : tool ? (
        <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {locale === "en"
            ? `Hard deletion blocked (${deleteDecision?.code}). Orders and purchase entitlements are retained.`
            : `硬删除已阻止（${deleteDecision?.code}）。订单和购买权益会保留。`}
        </p>
      ) : null}
    </div>
  );
}

function EditorSection({ title, intro, children }: React.PropsWithChildren<{ title: string; intro: string }>) {
  return (
    <section className="surface-panel p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-[#F6FAFF]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#8B95A7]">{intro}</p>
      </div>
      {children}
    </section>
  );
}

const toolAdminCopy = {
  zh: {
    saved: "保存成功。",
    deleted: "删除成功。",
    failed: "操作失败",
    listIntro: "以清单模式管理已保存工具，点击查看/编辑进入单独详情页后再修改、上下架或删除。",
    serviceListIntro: "以清单模式管理 AI 账号服务，点击查看/编辑进入单独详情页后再修改服务信息、价格、上下架或删除。",
    aiSkillListIntro: "管理可出售的 AI Skill、支持智能体、价格和 ZIP 交付包。",
    newTool: "新增工具",
    newService: "新增服务",
    newAiSkill: "新增 AI Skill",
    searchPlaceholder: "搜索工具名称、Slug、简介",
    serviceSearchPlaceholder: "搜索服务名称、Slug、简介",
    allStatus: "全部状态",
    allCategories: "全部分类",
    filter: "筛选",
    pagination: "共 {total} 个工具，当前第 {page} / {pageCount} 页",
    prev: "上一页",
    next: "下一页",
    tool: "工具",
    service: "服务",
    category: "分类",
    status: "状态",
    accessPrice: "权限/价格",
    publishCheck: "上架检查",
    actions: "操作",
    noTools: "暂无工具，先新增一个工具。",
    noServices: "暂无服务，先新增一个服务。",
    uncategorized: "未分类",
    free: "免费",
    publishable: "可上架",
    viewEdit: "查看/编辑",
    editorIntro: "在单独详情页编辑工具基础信息、权限、封面、商品图、下载文件和下载链接。",
    serviceEditorIntro: "在单独详情页编辑 AI 账号服务的基础信息、服务价格、封面、商品图、简介和详细介绍。",
    aiSkillEditorIntro: "编辑 AI Skill 的商品信息、支持智能体、价格和购买后可下载的 ZIP 交付包。",
    basicSection: "基础信息",
    basicToolIntro: "维护 AI 软件应用名称、分类、状态和排序。",
    basicServiceIntro: "维护 AI 账号服务名称、分类、状态和排序。",
    displaySection: "展示设置",
    displaySectionIntro: "设置首页推荐、封面上传和软件基础运行信息。",
    priceSpecSection: "规格与价格",
    softwarePriceSpecIntro: "按授权规格设置购买价格。第一条启用且大于 0 的规格会作为列表和筛选中的主价格。",
    servicePriceSpecIntro: "按服务规格设置服务价格。可配置不同账号、时长或套餐规格。",
    detailSection: "详情内容",
    detailSectionIntro: "维护简介、详细介绍、产品视频、商品图和购买后可见的下载链接内容。",
    priceSpecName: "规格名称",
    priceSpecNamePlaceholderA: "例如：单机授权",
    priceSpecNamePlaceholderB: "例如：终身授权",
    purchasePrice: "购买价格",
    priceSpecSortOrder: "排序",
    priceSpecActive: "启用",
    backToList: "返回工具清单",
    toolName: "工具名称",
    serviceName: "服务名称",
    englishName: "英文名称",
    englishNamePlaceholder: "例如：ENHE Batch Renamer",
    slugPlaceholder: "留空自动生成",
    sortOrder: "排序",
    coverUrl: "封面图地址",
    coverPlaceholder: "/uploads/cover.jpg 或 https://...",
    coverUpload: "本地上传封面图",
    coverHint: "建议尺寸 1200x675 或 16:9，JPG/PNG/WebP，8MB 以内。上传后会自动覆盖封面图地址。",
    version: "版本",
    systemRequirement: "系统要求",
    supportedAgents: "支持智能体",
    supportedAgentsHint: "选择该 Skill 已适配并经过验证的智能体。",
    aiSkillPackage: "Skill ZIP 交付包",
    aiSkillPackageHint: "仅支持 ZIP，最大 100MB。上传成功后还需保存本页，才能绑定到该商品。",
    aiSkillPackageChoose: "选择并上传 ZIP",
    aiSkillPackageUploading: "正在上传...",
    aiSkillPackageUploaded: "已上传",
    aiSkillPackageRemove: "移除当前交付包",
    aiSkillPackageFailed: "上传失败",
    downloadFile: "下载文件",
    downloadFileUrl: "下载链接",
    downloadFileUrlPlaceholder: "可填写网盘链接、提取码、下载说明、中文备注等任意内容",
    downloadFileUrlHint: "填写后会自动创建或更新文件记录，并作为该工具详情页的下载链接内容；如同时选择下载文件，将优先使用这里填写的内容。",
    unbound: "不绑定",
    needVip: "需要付费",
    downloadLinkVipOnly: "下载链接需购买后可见",
    homeRecommended: "首页推荐",
    servicePrice: "服务价格",
    shortDescription: "简介",
    content: "详细介绍",
    productVideo: "详细介绍产品视频",
    productVideoUrl: "当前视频地址",
    productVideoUrlPlaceholder: "/uploads/tool-videos/demo.mp4 或 https://...",
    productVideoUpload: "本地上传视频",
    productVideoTitle: "视频标题",
    productVideoTitlePlaceholder: "例如：产品功能演示",
    productVideoDescription: "视频说明",
    productVideoDescriptionPlaceholder: "可简要说明视频内容、适用场景或观看重点",
    productVideoHint: "最多上传 3 个产品视频，支持 MP4/WebM/MOV，建议单个 500MB 以内。上传新视频会自动替换对应视频地址；不上传则保留已填写的视频地址。",
    currentProductVideo: "当前视频",
    productImages: "详细介绍商品图",
    productImagesHint: "支持多张 JPG/PNG/WebP，建议 1200x900 或 4:3。图片会在工具详情页按电商图文格式展示；用上移/下移调整展示顺序，取消勾选后保存会移除。",
    productImageAlt: "商品图",
    keepProductImage: "保留此图",
    productImagePosition: "第 {position} 张",
    productImageMoveUp: "上移商品图",
    productImageMoveDown: "下移商品图",
    productImageRemoved: "保存后移除",
    noProductImages: "暂无商品图，上传后会在详情页展示。",
    saveTool: "保存工具",
    createTool: "新增工具",
    saveService: "保存服务",
    createService: "新增服务",
    deleteTool: "删除工具",
    deleteService: "删除服务",
    courseListIntro: "以清单模式管理 AI 技能学习课程，点击查看/编辑进入课程详情页后修改课程信息、价格和教程内容。",
    newCourse: "新增课程",
    courseSearchPlaceholder: "搜索课程名称、Slug、简介",
    course: "课程",
    noCourses: "暂无课程，请先新增一个课程。",
    courseEditorIntro: "在详情页编辑 AI 技能学习基础信息、价格、封面图和教程内容。",
    coursePrice: "课程价格",
    saveCourse: "保存课程",
    createCourse: "新增课程",
    deleteCourse: "删除课程",
    courseName: "课程名称",
    basicCourseIntro: "维护 AI 技能学习名称、分类、状态和排序。",
    courseContentSectionTitle: "课程内容管理",
    courseContentSectionIntro: "付费课程内容通过「教程管理」添加。购买后用户可查看所有已发布的教程内容。也可以通过「FAQ 管理」添加常见问题。",
    manageTutorials: "管理教程内容",
    manageFaq: "管理常见问题",
    saveBeforeContent: "请先保存课程，然后再添加教程内容。"
  },
  en: {
    saved: "Saved successfully.",
    deleted: "Deleted successfully.",
    failed: "Operation failed",
    listIntro: "Manage saved tools in list mode. Open View/Edit to update details, publish status, or delete a tool.",
    serviceListIntro: "Manage AI account services in list mode. Open View/Edit to update service details, price, publish status, or delete a service.",
    aiSkillListIntro: "Manage sellable AI Skills, supported agents, pricing, and ZIP delivery packages.",
    newTool: "New tool",
    newService: "New service",
    newAiSkill: "New AI Skill",
    searchPlaceholder: "Search name, slug, or description",
    serviceSearchPlaceholder: "Search service name, slug, or description",
    allStatus: "All statuses",
    allCategories: "All categories",
    filter: "Filter",
    pagination: "{total} tools, page {page} / {pageCount}",
    prev: "Previous",
    next: "Next",
    tool: "Tool",
    service: "Service",
    category: "Category",
    status: "Status",
    accessPrice: "Access / price",
    publishCheck: "Publish check",
    actions: "Actions",
    noTools: "No tools yet. Create one first.",
    noServices: "No services yet. Create one first.",
    uncategorized: "Uncategorized",
    free: "Free",
    publishable: "Publishable",
    viewEdit: "View/Edit",
    editorIntro: "Edit tool basics, permissions, cover image, product images, download file, and download-link content on this detail page.",
    serviceEditorIntro: "Edit AI account service basics, service price, cover image, product images, short description, and detailed introduction.",
    aiSkillEditorIntro: "Edit AI Skill product details, supported agents, pricing, and the ZIP package unlocked after purchase.",
    basicSection: "Basic information",
    basicToolIntro: "Maintain AI software app name, category, status, and display order.",
    basicServiceIntro: "Maintain AI account service name, category, status, and display order.",
    displaySection: "Display settings",
    displaySectionIntro: "Set homepage recommendation, cover upload, and software runtime basics.",
    priceSpecSection: "Specifications and prices",
    softwarePriceSpecIntro: "Set purchase prices by authorization specification. The first active price above zero becomes the primary list price.",
    servicePriceSpecIntro: "Set service prices by account, duration, or package specification.",
    detailSection: "Detail content",
    detailSectionIntro: "Maintain short description, detailed intro, product video, product images, and post-purchase download-link content.",
    priceSpecName: "Specification name",
    priceSpecNamePlaceholderA: "e.g. Single-machine license",
    priceSpecNamePlaceholderB: "e.g. Lifetime license",
    purchasePrice: "Purchase price",
    priceSpecSortOrder: "Sort",
    priceSpecActive: "Active",
    backToList: "Back to tool list",
    toolName: "Tool name",
    serviceName: "Service name",
    englishName: "English name",
    englishNamePlaceholder: "e.g. ENHE Batch Renamer",
    slugPlaceholder: "Leave blank to auto-generate",
    sortOrder: "Sort order",
    coverUrl: "Cover image URL",
    coverPlaceholder: "/uploads/cover.jpg or https://...",
    coverUpload: "Upload local cover",
    coverHint: "Recommended size: 1200x675 or 16:9, JPG/PNG/WebP, under 8MB. Uploading will replace the cover image URL.",
    version: "Version",
    systemRequirement: "System requirement",
    supportedAgents: "Supported agents",
    supportedAgentsHint: "Select the agents this Skill has been adapted and tested for.",
    aiSkillPackage: "Skill ZIP package",
    aiSkillPackageHint: "ZIP only, up to 100MB. Save this page after upload to bind the package to the product.",
    aiSkillPackageChoose: "Choose and upload ZIP",
    aiSkillPackageUploading: "Uploading...",
    aiSkillPackageUploaded: "Uploaded",
    aiSkillPackageRemove: "Remove current package",
    aiSkillPackageFailed: "Upload failed",
    downloadFile: "Download file",
    downloadFileUrl: "Download link",
    downloadFileUrlPlaceholder: "Enter any download link, extraction code, instructions, notes, or plain text",
    downloadFileUrlHint: "When filled, the system will create or update a file record and show this content in the tool detail download-link area. This content takes priority over the selected file.",
    unbound: "Unbound",
    needVip: "Requires payment",
    downloadLinkVipOnly: "Download link visible after purchase",
    homeRecommended: "Homepage recommended",
    servicePrice: "Service price",
    shortDescription: "Short description",
    content: "Detailed introduction",
    productVideo: "Product video in detail intro",
    productVideoUrl: "Current video URL",
    productVideoUrlPlaceholder: "/uploads/tool-videos/demo.mp4 or https://...",
    productVideoUpload: "Upload local video",
    productVideoTitle: "Video title",
    productVideoTitlePlaceholder: "e.g. Product feature demo",
    productVideoDescription: "Video description",
    productVideoDescriptionPlaceholder: "Briefly describe the video content, scenario, or viewing focus",
    productVideoHint: "Upload up to 3 product videos. MP4/WebM/MOV is supported, under 500MB each recommended. Uploading a new video replaces the matching video URL; leaving it empty keeps the URL you entered.",
    currentProductVideo: "Current video",
    productImages: "Product images in detail intro",
    productImagesHint: "Upload multiple JPG/PNG/WebP images. 1200x900 or 4:3 is recommended. Images appear in the tool detail page like an ecommerce product gallery; use move up/down to adjust display order, or uncheck images before saving to remove.",
    productImageAlt: "Product image",
    keepProductImage: "Keep this image",
    productImagePosition: "Image {position}",
    productImageMoveUp: "Move product image up",
    productImageMoveDown: "Move product image down",
    productImageRemoved: "Will be removed",
    noProductImages: "No product images yet. Upload images to display them on the detail page.",
    saveTool: "Save tool",
    createTool: "Create tool",
    saveService: "Save service",
    createService: "Create service",
    deleteTool: "Delete tool",
    deleteService: "Delete service",
    courseListIntro: "Manage AI skill-learning courses. Open View/Edit to update course details, price, and tutorial content.",
    newCourse: "New course",
    courseSearchPlaceholder: "Search course name, slug, or description",
    course: "Course",
    noCourses: "No courses yet. Create one first.",
    courseEditorIntro: "Edit course basics, price, cover image, and tutorial content on this detail page.",
    coursePrice: "Course price",
    saveCourse: "Save course",
    createCourse: "Create course",
    deleteCourse: "Delete course",
    courseName: "Course name",
    basicCourseIntro: "Maintain AI skill-learning course name, category, status, and display order.",
    courseContentSectionTitle: "Course content",
    courseContentSectionIntro: "Paid course content is added through Tutorial Management. After purchase, users can view all published tutorials. You can also add FAQs through FAQ Management.",
    manageTutorials: "Manage tutorials",
    manageFaq: "Manage FAQ",
    saveBeforeContent: "Save the course first, then add tutorial content."
  }
} as const;

const publishIssueTranslations: Record<string, string> = {
  未选择分类: "No category selected",
  未设置封面图: "No cover image",
  未填写简介: "Missing short description",
  未填写详细介绍: "Missing detailed introduction",
  未填写下载链接: "No download link content",
  "付费下载价格需大于 0": "Paid-download price must be greater than 0"
};

function localizePublishIssue(issue: string, locale: Locale) {
  if (locale === "zh") return issue;
  return publishIssueTranslations[issue] ?? issue;
}
