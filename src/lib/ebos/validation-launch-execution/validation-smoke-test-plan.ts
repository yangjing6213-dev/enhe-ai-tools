import type { EbosValidationSmokeCheckType, EbosValidationSmokeTestItem } from "./validation-launch-execution-types";

const DEFAULT_SITE_URL = "https://www.enhe-tech.com.cn";
const VALIDATION_PATHS = [
  "/validation/ai-prompt-kit",
  "/en/validation/ai-prompt-kit"
] as const;

export function buildValidationSmokeTestPlan(options: {
  targetDate: string | Date;
  siteUrl?: string;
}): EbosValidationSmokeTestItem[] {
  const siteUrl = normalizeSiteUrl(options.siteUrl ?? DEFAULT_SITE_URL);
  const urls = [
    ...VALIDATION_PATHS.map((path) => `http://localhost:3000${path}`),
    ...VALIDATION_PATHS.map((path) => `${siteUrl}${path}`)
  ];

  return urls.flatMap((url) => buildSmokeItemsForUrl(url));
}

export function buildLocalSmokeTestCommands(): string[] {
  return [
    "npm run build",
    "Start the Next.js app locally, then open http://localhost:3000/validation/ai-prompt-kit",
    "Start the Next.js app locally, then open http://localhost:3000/en/validation/ai-prompt-kit"
  ];
}

export function buildProductionSmokeTestCommands(siteUrl: string = DEFAULT_SITE_URL): string[] {
  const normalized = normalizeSiteUrl(siteUrl);
  return [
    `npx tsx scripts/check-ebos-validation-post-launch.ts --site-url ${normalized} --dry-run`,
    `${normalized}/validation/ai-prompt-kit`,
    `${normalized}/en/validation/ai-prompt-kit`
  ];
}

function buildSmokeItemsForUrl(url: string): EbosValidationSmokeTestItem[] {
  return [
    smokeItem(url, "http_status", "Page responds with 200."),
    smokeItem(url, "page_content", "Hero, FAQ, and compliance notice are visible.", "AI Prompt Kit"),
    smokeItem(url, "cta_present", "CTA copy is present and does not claim unobserved results.", "CTA"),
    smokeItem(url, "metadata", "Title and description metadata are present."),
    smokeItem(url, "tracking_plan", "CTA tracking plan includes validation_ai_prompt_kit_cta_click.")
  ];
}

function smokeItem(
  url: string,
  checkType: EbosValidationSmokeCheckType,
  notes: string,
  expectedText?: string
): EbosValidationSmokeTestItem {
  return {
    id: `${checkType}-${url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/-$/, "")}`,
    url,
    expectedStatus: 200,
    checkType,
    ...(expectedText ? { expectedText } : {}),
    status: "pending",
    notes
  };
}

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.replace(/\/+$/, "");
}
