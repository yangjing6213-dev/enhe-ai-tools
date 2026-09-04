import { getDictionary, type Locale } from "@/lib/i18n";
import { getPrimaryToolPrice, type ToolPriceSpecStatus } from "@/lib/tool-price-specs";

type ToolHighlightInput = {
  type: "software" | "online" | "skill_learning";
  isDownloadPaid?: boolean;
  downloadPrice?: unknown;
  priceSpecs?: { price: unknown; status: ToolPriceSpecStatus }[];
};

export function buildToolCardHighlights(tool: ToolHighlightInput, locale: Locale) {
  const t = getDictionary(locale);
  const servicePrice = getPrimaryToolPrice(tool.priceSpecs ?? [], tool.downloadPrice);
  const isPaid = (tool.type === "software" && tool.isDownloadPaid) || (tool.type === "online" && Number.isFinite(servicePrice) && servicePrice > 0);
  const access = isPaid ? (tool.type === "online" ? t.toolCard.capabilityPaidService : t.toolCard.capabilityPaidDownload) : t.toolCard.capabilityFree;
  const runtime = tool.type === "software" ? t.toolCard.capabilitySoftware : tool.type === "skill_learning" ? t.toolCard.capabilityCourse : t.toolCard.capabilityOnline;
  const commerce = isPaid ? (tool.type === "online" ? t.toolCard.capabilityPaidService : t.toolCard.capabilityPaidDownload) : t.toolCard.capabilityAccess;

  return Array.from(new Set([runtime, access, commerce]));
}
