import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getPrimaryToolPrice, type ToolPriceSpecStatus } from "@/lib/tool-price-specs";
import { resolveAiWorkflowDeliveryMode } from "@/lib/ai-workflows/rules";

export function buildValueSentence(description: string, locale: Locale) {
  const sentence = description.split(/[。?!；，,.!?]/).find(Boolean)?.trim() ?? description.trim();
  const maxLength = locale === "zh" ? 44 : 86;
  return sentence.length > maxLength ? `${sentence.slice(0, maxLength - 1)}...` : sentence;
}

type ToolHighlightInput = {
  type: "software" | "online" | "skill_learning" | "ai_skill" | "ai_workflow";
  isDownloadPaid?: boolean;
  downloadPrice?: unknown;
  priceSpecs?: { price: unknown; status: ToolPriceSpecStatus }[];
  downloadFileId?: string | null;
  aiWorkflowCandidate?: { status: string; fileId: string | null } | null;
};

export function buildToolCardHighlights(tool: ToolHighlightInput, locale: Locale) {
  const t = getDictionary(locale);
  if (tool.type === "ai_workflow") {
    const mode = tool.aiWorkflowCandidate
      ? resolveAiWorkflowDeliveryMode({
          candidateStatus: tool.aiWorkflowCandidate.status,
          candidateFileId: tool.aiWorkflowCandidate.fileId,
          toolFileId: tool.downloadFileId ?? null,
        })
      : null;
    const packagePrice = getPrimaryToolPrice(tool.priceSpecs ?? [], tool.downloadPrice);
    const hasPaidPackage = tool.isDownloadPaid === true && Number.isFinite(packagePrice) && packagePrice > 0;
    const delivery = mode === "repository_link"
      ? locale === "en" ? "GitHub repository only" : "仅 GitHub 原仓库"
      : mode === "package"
        ? hasPaidPackage
          ? t.toolCard.capabilityPaidDownload
          : tool.isDownloadPaid === false
            ? locale === "en" ? "Free package" : "免费交付包"
            : locale === "en" ? "Check price and access" : "查看价格与获取方式"
        : locale === "en" ? "Check delivery details" : "查看获取方式";
    return [locale === "en" ? "AI workflow" : "AI 工作流", delivery];
  }
  const isDownloadProduct = tool.type === "software" || tool.type === "ai_skill";
  const priceFallback = isDownloadProduct ? tool.downloadPrice : 0;
  const servicePrice = getPrimaryToolPrice(tool.priceSpecs ?? [], priceFallback);
  const isPaid =
    (isDownloadProduct && tool.isDownloadPaid) ||
    ((tool.type === "online" || tool.type === "skill_learning") && Number.isFinite(servicePrice) && servicePrice > 0);
  const paidCapability =
    tool.type === "online"
      ? t.toolCard.capabilityPaidService
      : tool.type === "skill_learning"
        ? t.toolCard.capabilityPaidCourse
        : t.toolCard.capabilityPaidDownload;
  const access = isPaid ? paidCapability : t.toolCard.capabilityFree;
  const runtime = tool.type === "software"
    ? t.toolCard.capabilitySoftware
    : tool.type === "ai_skill"
      ? t.toolCard.capabilitySkill
      : tool.type === "skill_learning"
        ? t.toolCard.capabilityCourse
        : t.toolCard.capabilityOnline;
  const commerce = isPaid ? paidCapability : t.toolCard.capabilityAccess;

  return Array.from(new Set([runtime, access, commerce]));
}
