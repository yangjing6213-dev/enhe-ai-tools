import type { EbosWebsiteHealthScore, EbosWebsiteHealthSnapshot } from "./health-types";

export function renderWebsiteHealthMarkdown(
  snapshot: EbosWebsiteHealthSnapshot,
  score: EbosWebsiteHealthScore
): string {
  return [
    "# ENHE Website Health Snapshot",
    "",
    `Generated At: ${snapshot.generatedAt.toISOString()}`,
    "",
    "## 1. 总体健康评分",
    `- Score: ${score.score}`,
    `- Grade: ${score.grade}`,
    `- Confidence: ${score.confidence}`,
    "",
    "## 2. 命令检查结果",
    renderCommands(snapshot),
    "",
    "### Smoke Checks",
    renderSmokeChecks(snapshot),
    "",
    "## 产品页 URL 来源说明",
    renderProductPageUrlSource(snapshot),
    "",
    "## 3. 主要风险",
    renderItems(score.risks.map((risk) => `[${risk.severity}] ${risk.message}`)),
    "",
    "## 4. 修复建议",
    renderItems(score.recommendations.map((item) => `[${item.priority}] ${item.message}`)),
    "",
    "## 5. 后续接入建议",
    "- Add Playwright smoke checks for homepage and key product pages.",
    "- Add Lighthouse/PageSpeed snapshots when Step 3 health checks are stable.",
    "- Feed this health snapshot into the weekly EBOS report before building admin UI.",
    ""
  ].join("\n");
}

function renderCommands(snapshot: EbosWebsiteHealthSnapshot) {
  if (!snapshot.commands.length) return "- No command checks recorded.";
  return snapshot.commands
    .map((command) => `- [${command.status}] ${command.key}: ${command.command} (${command.summary})`)
    .join("\n");
}

function renderSmokeChecks(snapshot: EbosWebsiteHealthSnapshot) {
  const smokeChecks = snapshot.commands.filter((command) => ["sitemap", "robots", "homepage", "key_product_pages"].includes(command.key));
  if (!smokeChecks.length) return "- Smoke checks not recorded.";
  return smokeChecks
    .map((command) => `- [${command.status}] ${command.key}: ${command.url || "no url"}${command.httpStatus ? ` HTTP ${command.httpStatus}` : ""}`)
    .join("\n");
}

function renderProductPageUrlSource(snapshot: EbosWebsiteHealthSnapshot) {
  const productChecks = snapshot.commands.filter((command) => command.key === "key_product_pages");
  if (!productChecks.length) return "- No key product page smoke checks recorded.";

  const sources = unique(productChecks.map((command) => command.source ?? "unknown"));
  const source = sources.length === 1 ? sources[0] : "mixed";
  const hasEnvironmentMismatchRisk = productChecks.some((command) => command.environmentMismatchRisk);
  const checkedUrls = productChecks.map((command) => {
    const pageType = command.isProductDetailPage === false
      ? "fallback listing page"
      : "product detail page";
    const confidence = command.sourceConfidence ? `; confidence: ${command.sourceConfidence}` : "";
    const reason = command.reason ? `; reason: ${command.reason}` : "";
    return `- [${command.status}] ${command.url || "no url"} (${pageType}; source: ${command.source ?? "unknown"}${confidence}${reason})`;
  });

  return [
    `- Source: ${source}`,
    `- Environment mismatch risk: ${hasEnvironmentMismatchRisk ? "yes" : "no"}`,
    "- Checked URLs:",
    ...checkedUrls
  ].join("\n");
}

function renderItems(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- None.";
}

function unique(values: string[]) {
  return [...new Set(values)];
}
