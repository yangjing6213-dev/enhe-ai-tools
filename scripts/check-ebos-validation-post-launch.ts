import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildValidationPostLaunchCheckReport,
  renderValidationPostLaunchCheckMarkdown,
  type EbosValidationPostLaunchCheckItem,
  type EbosValidationSmokeCheckType
} from "@/lib/ebos/validation-launch-execution";

const VALIDATION_PATHS = [
  "/validation/ai-prompt-kit",
  "/en/validation/ai-prompt-kit"
] as const;

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1] ?? null;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }
  return value;
}

function parseTargetDateKey() {
  const value = readArg("--date");
  if (!value) return toDateKey(new Date());
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid --date ${value}. Expected YYYY-MM-DD.`);
  }
  return value.slice(0, 10);
}

async function main() {
  const targetDate = parseTargetDateKey();
  const siteUrl = normalizeSiteUrl(readArg("--site-url") ?? "https://www.enhe-tech.com.cn");
  const dryRun = process.argv.includes("--dry-run");
  const checks = dryRun ? undefined : await runPublicChecks(siteUrl);
  const warnings = dryRun ? ["Dry-run only; no network request was made."] : [];
  const report = buildValidationPostLaunchCheckReport({
    targetDate,
    siteUrl,
    dryRun,
    checks,
    warnings
  });
  const outputDir = resolve(process.cwd(), "reports", "ebos", "validation", "launch-execution");
  const jsonPath = resolve(outputDir, `${targetDate}-post-launch-check.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-post-launch-check.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderValidationPostLaunchCheckMarkdown(report)}\n`, "utf8");

  console.log("EBOS validation post-launch check generated:");
  console.log(`- dryRun: ${report.dryRun}`);
  console.log(`- siteUrl: ${report.siteUrl}`);
  console.log(`- status: ${report.status}`);
  console.log(`- checks count: ${report.checks.length}`);
  console.log(`- blockers count: ${report.blockers.length}`);
  console.log(`- warnings count: ${report.warnings.length}`);
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
  console.log("- URLs:");
  for (const path of VALIDATION_PATHS) {
    console.log(`  - ${siteUrl}${path}`);
  }
}

async function runPublicChecks(siteUrl: string): Promise<EbosValidationPostLaunchCheckItem[]> {
  const checks: EbosValidationPostLaunchCheckItem[] = [];

  for (const path of VALIDATION_PATHS) {
    const url = `${siteUrl}${path}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow"
      });
      const text = await response.text();
      checks.push(check(url, "http_status", response.ok ? "pass" : "fail", `GET returned ${response.status}.`, response.status));
      checks.push(check(url, "page_content", /AI Prompt Kit|Prompt Kit|验证|validation/i.test(text) ? "pass" : "fail", "Page should contain validation page content."));
      checks.push(check(url, "cta_present", /cta|mailto:|开始|购买|contact|validation_ai_prompt_kit_cta_click/i.test(text) ? "pass" : "fail", "Page should contain a CTA or CTA tracking marker."));
      checks.push(check(url, "metadata", /<title[\s>]|<meta[^>]+description/i.test(text) ? "pass" : "fail", "Page should contain title and description metadata."));
      checks.push(check(url, "tracking_plan", /validation_ai_prompt_kit_cta_click/i.test(text) ? "pass" : "warning", "Rendered HTML should expose the validation CTA tracking event when applicable.", undefined, "Tracking event may be bound client-side; verify manually if absent from HTML."));
    } catch (error) {
      checks.push(check(
        url,
        "http_status",
        "warning",
        "Network request failed; script recorded warning instead of crashing.",
        undefined,
        error instanceof Error ? error.message : "unknown network error"
      ));
    }
  }

  return checks;
}

function check(
  url: string,
  checkType: EbosValidationSmokeCheckType,
  status: EbosValidationPostLaunchCheckItem["status"],
  notes: string,
  actualStatus?: number,
  warning?: string
): EbosValidationPostLaunchCheckItem {
  return {
    id: `${checkType}-${url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/-$/, "")}`,
    url,
    expectedStatus: 200,
    checkType,
    dryRun: false,
    status,
    ...(actualStatus ? { actualStatus } : {}),
    notes,
    ...(warning ? { warning } : {})
  };
}

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.replace(/\/+$/, "");
}

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
