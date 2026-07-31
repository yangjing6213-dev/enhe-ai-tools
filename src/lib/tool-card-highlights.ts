import { getDictionary, type Locale } from "@/lib/i18n";
import { getPrimaryToolPrice, type ToolPriceSpecStatus } from "@/lib/tool-price-specs";

type ToolHighlightInput = {
  type: "software" | "online" | "skill_learning" | "ai_skill";
  isDownloadPaid?: boolean;
  downloadPrice?: unknown;
  priceSpecs?: { price: unknown; status: ToolPriceSpecStatus }[];
};

export function buildToolCardHighlights(tool: ToolHighlightInput, locale: Locale) {
  const t = getDictionary(locale);
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
