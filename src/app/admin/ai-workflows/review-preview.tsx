import type { Tool } from "@prisma/client";
import { AiWorkflowContent } from "@/app/ai-workflows/workflow-content";
import { AiWorkflowCoverImage } from "@/app/ai-workflows/workflow-cover-image";
import { buildAiWorkflowCoverSvg } from "@/lib/ai-workflows/generated-cover";
import { buildLocalizedToolOptionalText } from "@/lib/tool-localization";
import { pendingWorkflowPresentation } from "./review";

type PreviewTool = Pick<Tool, "slug" | "name" | "englishName" | "shortDescription" | "content" | "coverImage">;

export function AiWorkflowReviewPreview({ tool, repository, pendingReport }: { tool: PreviewTool; repository: string; pendingReport?: unknown }) {
  const copy = { ...tool, ...pendingWorkflowPresentation(pendingReport) };
  const generated = !copy.coverImage || /\/api\/ai-workflows\/covers\//.test(copy.coverImage);
  const fallbackImage = `data:image/svg+xml;base64,${Buffer.from(buildAiWorkflowCoverSvg({ name: copy.englishName || copy.name, description: copy.shortDescription || "", repository })).toString("base64")}`;
  return <div className="mt-4 space-y-5">
    <AiWorkflowCoverImage coverImage={generated ? null : copy.coverImage} slug={copy.slug} fallbackImage={fallbackImage} alt={`${copy.name} — 封面 / Cover`} width={800} height={450} unoptimized className="aspect-video w-full max-w-2xl rounded-xl border border-white/10 object-contain" />
    <p className="text-sm text-[#9CAABD]">介绍由 AI 辅助整理，请核对中英文内容、封面、来源和使用限制；安装方法不等于已实际验证。</p>
    <div className="grid gap-5 xl:grid-cols-2">{(["zh", "en"] as const).map((locale) => <section key={locale} lang={locale === "zh" ? "zh-CN" : "en"} className="min-w-0 rounded-xl border border-white/10 p-4">
      <h2 className="text-xl font-semibold text-white">{locale === "zh" ? "中文内容" : "English content"}</h2>
      <h3 className="mt-3 font-semibold text-white">{locale === "zh" ? copy.name : copy.englishName || copy.name}</h3>
      <p className="my-3 whitespace-pre-wrap text-sm leading-6 text-[#D7E0EB]">{buildLocalizedToolOptionalText(copy.shortDescription, locale) || (locale === "zh" ? "缺少中文简介，请先编辑。" : "English summary is missing. Edit before publication.")}</p>
      <AiWorkflowContent content={buildLocalizedToolOptionalText(copy.content, locale) || (locale === "zh" ? "缺少中文正文，请先编辑。" : "English content is missing. Edit before publication.")} />
    </section>)}</div>
  </div>;
}
