import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  hasExternalIntakeRecordSignal,
  readExternalIntakeInput
} from "../validation-intake";
import type {
  EbosValidationAssetCheck,
  EbosValidationBasicCheck,
  EbosValidationExternalIntakeCheck,
  EbosValidationLaunchReadinessReport,
  EbosValidationPageCheck,
  EbosValidationTrackingCheck
} from "./validation-launch-types";

const REQUIRED_VALIDATION_ASSETS = [
  ["2026-07-03-ai-prompt-kit-landing-copy.md", "AI Prompt Kit landing page copy"],
  ["2026-07-03-ai-prompt-kit-marketplace-listings.md", "AI Prompt Kit marketplace listing copy"],
  ["2026-07-03-ai-prompt-kit-minimum-product.md", "AI Prompt Kit minimum product draft"],
  ["2026-07-03-ai-video-studio-validation-copy.md", "AI Video Studio validation copy"],
  ["2026-07-03-codex-operator-summary.md", "Codex operator summary"],
  ["2026-07-03-faceswap-validation-copy.md", "FaceSwap validation copy"],
  ["2026-07-03-social-promotion-copy.md", "Social promotion copy"],
  ["2026-07-03-three-day-validation-checklist.md", "Three-day validation checklist"],
  ["2026-07-03-validation-input-fill-guide.md", "Validation input fill guide"]
] as const;

const REQUIRED_TRACKING_EVENTS = [
  "validation_ai_prompt_kit_cta_click",
  "validation_faceswap_cta_click",
  "validation_ai_video_cta_click"
] as const;

export async function checkValidationLaunchReadiness(options: {
  targetDate: string | Date;
  projectRoot?: string;
}): Promise<EbosValidationLaunchReadinessReport> {
  const targetDate = toDateKey(options.targetDate);
  const projectRoot = resolve(options.projectRoot ?? process.cwd());
  const validationPages = await Promise.all([
    checkValidationPageFile(join(projectRoot, "src", "app", "(zh-public)", "validation", "ai-prompt-kit", "page.tsx"), "/validation/ai-prompt-kit"),
    checkValidationPageFile(join(projectRoot, "src", "app", "en", "validation", "ai-prompt-kit", "page.tsx"), "/en/validation/ai-prompt-kit")
  ]);
  const assetFiles = await checkValidationAssets(join(projectRoot, "docs", "ebos", "validation-assets"));
  const trackingChecks = await checkTrackingEvents({ projectRoot });
  const externalIntakeChecks = await checkExternalIntakeFiles({ projectRoot, targetDate });
  const deploymentChecks = await checkDeploymentChecks(projectRoot);
  const seoGeoChecks = buildSeoGeoChecks(validationPages);
  const partialReport = {
    validationPages,
    assetFiles,
    trackingChecks,
    seoGeoChecks,
    externalIntakeChecks,
    deploymentChecks
  };
  const readinessScore = calculateLaunchReadinessScore(partialReport);
  const blockers = buildBlockers(validationPages, deploymentChecks);
  const warnings = buildWarnings(partialReport);
  const readinessStatus = buildReadinessStatus(partialReport, blockers, warnings, readinessScore);
  const nextActions = buildNextActions(readinessStatus, blockers, warnings);

  return {
    reportType: "validation_launch_readiness",
    targetDate,
    generatedAt: new Date().toISOString(),
    ...partialReport,
    readinessScore,
    readinessStatus,
    blockers,
    warnings,
    nextActions
  };
}

export async function checkValidationPageFile(filePath: string, path: string): Promise<EbosValidationPageCheck> {
  try {
    const source = await readPageSourceWithSharedComponent(filePath);
    const hasHero = /<h1|\bhero\b|\beyebrow\b/i.test(source);
    const hasSummary = /\bsummary\b|summaryTitle|SectionTitle|概览|摘要|总结/i.test(source);
    const hasCTA = /\bCTA\b|primaryCta|data-analytics-event|mailto:|<Link|<a\s/i.test(source);
    const hasFAQ = /\bFAQ\b|buildFaqSchema|faqSchema/i.test(source);
    const hasComplianceNotice = /compliance|合规|不承诺|no income|ranking|revenue/i.test(source);
    const hasTrackingEvent = /validation_ai_prompt_kit_cta_click/.test(source);
    const hasSeoMetadata = /generateMetadata|buildPageMetadata|metaTitle|metaDescription|metadata/i.test(source);
    const warnings = [
      ...(!hasHero ? ["Missing Hero content."] : []),
      ...(!hasSummary ? ["Missing Summary content."] : []),
      ...(!hasCTA ? ["Missing CTA."] : []),
      ...(!hasFAQ ? ["Missing FAQ."] : []),
      ...(!hasComplianceNotice ? ["Missing compliance notice."] : []),
      ...(!hasTrackingEvent ? ["Missing CTA tracking event."] : []),
      ...(!hasSeoMetadata ? ["Missing SEO metadata."] : [])
    ];

    return {
      path,
      filePath,
      exists: true,
      hasHero,
      hasSummary,
      hasCTA,
      hasFAQ,
      hasComplianceNotice,
      hasTrackingEvent,
      hasSeoMetadata,
      warnings
    };
  } catch {
    return {
      path,
      filePath,
      exists: false,
      hasHero: false,
      hasSummary: false,
      hasCTA: false,
      hasFAQ: false,
      hasComplianceNotice: false,
      hasTrackingEvent: false,
      hasSeoMetadata: false,
      warnings: [`Missing validation page file: ${path}`]
    };
  }
}

export async function checkValidationAssets(baseDir: string): Promise<EbosValidationAssetCheck[]> {
  return Promise.all(REQUIRED_VALIDATION_ASSETS.map(async ([fileName, purpose]) => {
    const filePath = join(baseDir, fileName);
    const stats = await statOrNull(filePath);
    const exists = Boolean(stats?.isFile());
    const readyForUse = Boolean(stats?.isFile() && stats.size > 0);

    return {
      filePath,
      exists,
      purpose,
      readyForUse,
      warnings: [
        ...(!exists ? [`Missing validation asset: ${fileName}`] : []),
        ...(exists && !readyForUse ? [`Validation asset is empty: ${fileName}`] : [])
      ]
    };
  }));
}

export async function checkTrackingEvents(options: {
  projectRoot?: string;
  analyticsFilePath?: string;
} = {}): Promise<EbosValidationTrackingCheck[]> {
  const sourceFile = options.analyticsFilePath ?? join(options.projectRoot ?? process.cwd(), "src", "lib", "analytics.ts");
  const source = await readTextOrEmpty(sourceFile);

  return REQUIRED_TRACKING_EVENTS.map((eventName) => {
    const found = source.includes(eventName);
    return {
      eventName,
      expectedLocation: "src/lib/analytics.ts analyticsEventNames",
      found,
      sourceFile,
      warnings: found ? [] : [`Missing analytics event whitelist entry: ${eventName}`]
    };
  });
}

export async function checkExternalIntakeFiles(options: {
  projectRoot?: string;
  targetDate: string | Date;
}): Promise<EbosValidationExternalIntakeCheck[]> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const targetDate = toDateKey(options.targetDate);
  const intakeRoot = join(projectRoot, "reports", "ebos", "validation", "intake");
  const template = await checkFirstExistingFile(
    "external_intake_template",
    [
      join(intakeRoot, "templates", `${targetDate}-external-intake-template.json`),
      join(intakeRoot, "templates", `${targetDate}-external-intake-template.md`)
    ],
    "External intake template"
  );
  const inputPath = join(intakeRoot, "inputs", `${targetDate}-external-intake-input.json`);
  const input = await checkExternalIntakeInput(inputPath);
  const importReport = await checkFirstExistingFile(
    "external_intake_import_report",
    [
      join(intakeRoot, "imports", `${targetDate}-external-intake-import-report.json`),
      join(intakeRoot, "imports", `${targetDate}-external-intake-import-report.md`)
    ],
    "External intake import report"
  );

  return [template, input, importReport];
}

export function calculateLaunchReadinessScore(input: Pick<
  EbosValidationLaunchReadinessReport,
  "validationPages" | "assetFiles" | "trackingChecks" | "seoGeoChecks" | "externalIntakeChecks" | "deploymentChecks"
>) {
  const pageScore = average(input.validationPages.map(scoreValidationPage));
  const assetScore = average(input.assetFiles.map((check) => check.exists && check.readyForUse ? 1 : 0));
  const trackingScore = average(input.trackingChecks.map((check) => check.found ? 1 : 0));
  const seoGeoScore = average(input.seoGeoChecks.map((check) => check.passed ? 1 : 0));
  const externalScore = average(input.externalIntakeChecks.map((check) => {
    if (!check.exists) return 0;
    return check.readyForUse ? 1 : 0.5;
  }));
  const deploymentScore = average(input.deploymentChecks.map((check) => check.passed ? 1 : 0));
  const weighted = pageScore * 35
    + assetScore * 20
    + trackingScore * 15
    + seoGeoScore * 10
    + externalScore * 10
    + deploymentScore * 10;

  return Math.max(0, Math.min(100, Math.round(weighted)));
}

export async function readLatestValidationLaunchReadinessReport(options: {
  targetDate?: string | Date;
  reportsRoot?: string;
} = {}): Promise<{ filePath: string; report: EbosValidationLaunchReadinessReport } | null> {
  const targetDate = options.targetDate ? toDateKey(options.targetDate) : null;
  const directory = join(options.reportsRoot ?? "reports/ebos", "validation", "launch").replace(/\\/g, "/");

  if (targetDate) {
    const exactPath = `${directory}/${targetDate}-validation-launch-readiness.json`;
    const exact = await readReadinessReportFile(exactPath);
    if (exact) return { filePath: exactPath, report: exact };
  }

  try {
    const fileName = (await readdir(directory))
      .filter((name) => name.endsWith("-validation-launch-readiness.json"))
      .sort()
      .at(-1);
    if (!fileName) return null;
    const filePath = `${directory}/${fileName}`;
    const report = await readReadinessReportFile(filePath);
    return report ? { filePath, report } : null;
  } catch {
    return null;
  }
}

function buildSeoGeoChecks(validationPages: EbosValidationPageCheck[]): EbosValidationBasicCheck[] {
  const pagesExist = validationPages.every((page) => page.exists);
  const metadataPassed = pagesExist && validationPages.every((page) => page.hasSeoMetadata);
  const answerabilityPassed = pagesExist && validationPages.every((page) => page.hasSummary && page.hasFAQ && page.hasComplianceNotice);

  return [
    {
      key: "metadata",
      label: "SEO metadata",
      passed: metadataPassed,
      warnings: metadataPassed ? [] : ["Validation pages need SEO metadata before launch."]
    },
    {
      key: "answerability",
      label: "GEO answerability",
      passed: answerabilityPassed,
      warnings: answerabilityPassed ? [] : ["Validation pages need summary, FAQ, and compliance copy for AI answer engines."]
    }
  ];
}

async function checkDeploymentChecks(projectRoot: string): Promise<EbosValidationBasicCheck[]> {
  const packageJson = await readJsonRecord(join(projectRoot, "package.json"));
  const scripts = typeof packageJson.scripts === "object" && packageJson.scripts ? packageJson.scripts as Record<string, unknown> : {};

  return [
    deploymentCheck("build_script", "Build script", typeof scripts.build === "string", "package.json must define npm run build."),
    deploymentCheck("lint_script", "Lint script", typeof scripts.lint === "string", "package.json must define npm run lint."),
    deploymentCheck("typecheck_script", "Typecheck script", typeof scripts.typecheck === "string", "package.json must define npm run typecheck.")
  ];
}

function deploymentCheck(
  key: string,
  label: string,
  passed: boolean,
  warning: string
): EbosValidationBasicCheck {
  return {
    key,
    label,
    passed,
    warnings: passed ? [] : [warning]
  };
}

function buildBlockers(
  validationPages: EbosValidationPageCheck[],
  deploymentChecks: EbosValidationBasicCheck[]
) {
  return [
    ...validationPages
      .filter((page) => !page.exists)
      .map((page) => `Missing validation page: ${page.path}`),
    ...deploymentChecks
      .filter((check) => check.key === "build_script" && !check.passed)
      .map((check) => `Build check is unavailable: ${check.label}`)
  ];
}

function buildWarnings(input: Pick<
  EbosValidationLaunchReadinessReport,
  "validationPages" | "assetFiles" | "trackingChecks" | "seoGeoChecks" | "externalIntakeChecks" | "deploymentChecks"
>) {
  return [
    ...input.validationPages.flatMap((check) => check.warnings),
    ...input.assetFiles.flatMap((check) => check.warnings),
    ...input.trackingChecks.flatMap((check) => check.warnings),
    ...input.seoGeoChecks.flatMap((check) => check.warnings),
    ...input.externalIntakeChecks.flatMap((check) => check.warnings),
    ...input.deploymentChecks.flatMap((check) => check.warnings)
  ];
}

function buildReadinessStatus(
  input: Pick<
    EbosValidationLaunchReadinessReport,
    "validationPages" | "assetFiles" | "trackingChecks" | "seoGeoChecks" | "deploymentChecks"
  >,
  blockers: string[],
  warnings: string[],
  score: number
) {
  if (blockers.length > 0) return "blocked";
  const needsFixes = score < 80
    || input.validationPages.some((page) => !page.hasHero || !page.hasSummary || !page.hasCTA || !page.hasFAQ || !page.hasComplianceNotice || !page.hasTrackingEvent || !page.hasSeoMetadata)
    || input.assetFiles.some((asset) => !asset.exists || !asset.readyForUse)
    || input.trackingChecks.some((check) => !check.found)
    || input.seoGeoChecks.some((check) => !check.passed)
    || input.deploymentChecks.some((check) => !check.passed);
  if (needsFixes) return "needs_fixes";
  return warnings.length > 0 ? "ready_with_warnings" : "ready";
}

function buildNextActions(
  status: EbosValidationLaunchReadinessReport["readinessStatus"],
  blockers: string[],
  warnings: string[]
) {
  if (status === "blocked") {
    return [
      "Fix validation launch blockers before publishing.",
      ...blockers.slice(0, 5)
    ];
  }

  if (status === "needs_fixes") {
    return [
      "Fix readiness warnings before launch.",
      ...warnings.slice(0, 5)
    ];
  }

  if (status === "ready_with_warnings") {
    return [
      "Validation page can proceed only if warnings are accepted.",
      "Keep external channel metrics empty until real user data exists.",
      ...warnings.slice(0, 3)
    ];
  }

  return [
    "Start real validation launch.",
    "Generate launch runbook and follow post-launch evidence capture steps."
  ];
}

function scoreValidationPage(page: EbosValidationPageCheck) {
  if (!page.exists) return 0;
  const checks = [
    page.hasHero,
    page.hasSummary,
    page.hasCTA,
    page.hasFAQ,
    page.hasComplianceNotice,
    page.hasTrackingEvent,
    page.hasSeoMetadata
  ];
  return checks.filter(Boolean).length / checks.length;
}

async function checkFirstExistingFile(
  key: EbosValidationExternalIntakeCheck["key"],
  filePaths: string[],
  label: string
): Promise<EbosValidationExternalIntakeCheck> {
  for (const filePath of filePaths) {
    const stats = await statOrNull(filePath);
    if (stats?.isFile()) {
      return {
        key,
        filePath,
        exists: true,
        readyForUse: stats.size > 0,
        warnings: stats.size > 0 ? [] : [`${label} is empty.`]
      };
    }
  }

  return {
    key,
    filePath: filePaths[0] ?? "",
    exists: false,
    readyForUse: false,
    warnings: [`Missing ${label}.`]
  };
}

async function checkExternalIntakeInput(filePath: string): Promise<EbosValidationExternalIntakeCheck> {
  const stats = await statOrNull(filePath);
  if (!stats?.isFile()) {
    return {
      key: "external_intake_input",
      filePath,
      exists: false,
      readyForUse: false,
      warnings: ["Missing External intake input."]
    };
  }

  const readResult = await readExternalIntakeInput(filePath);
  const hasSignal = readResult.input.planResults.some(hasExternalIntakeRecordSignal);

  return {
    key: "external_intake_input",
    filePath,
    exists: true,
    readyForUse: hasSignal,
    warnings: [
      ...readResult.warnings.map((warning) => warning.message),
      ...(!hasSignal ? ["External intake input exists but is not filled with real channel data."] : [])
    ]
  };
}

async function readPageSourceWithSharedComponent(filePath: string) {
  const source = await readFile(filePath, "utf8");
  const componentPath = inferValidationComponentPath(filePath, source);
  if (!componentPath) return source;
  const componentSource = await readTextOrEmpty(componentPath);
  return `${source}\n${componentSource}`;
}

function inferValidationComponentPath(filePath: string, source: string) {
  if (!/validation-ai-prompt-kit-page|ValidationAiPromptKitPage/.test(source)) return null;
  const normalized = filePath.replace(/\\/g, "/");
  const marker = "/src/app/";
  const index = normalized.indexOf(marker);
  if (index === -1) return null;
  const projectRoot = normalized.slice(0, index);
  return join(projectRoot, "src", "components", "validation-ai-prompt-kit-page.tsx");
}

async function readReadinessReportFile(filePath: string) {
  try {
    const report = JSON.parse(await readFile(filePath, "utf8")) as EbosValidationLaunchReadinessReport;
    return report.reportType === "validation_launch_readiness" ? report : null;
  } catch {
    return null;
  }
}

async function readJsonRecord(filePath: string): Promise<Record<string, unknown>> {
  try {
    const source = await readFile(filePath, "utf8");
    const value = JSON.parse(source);
    return value && typeof value === "object" ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

async function readTextOrEmpty(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

async function statOrNull(filePath: string) {
  try {
    return await stat(filePath);
  } catch {
    return null;
  }
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
