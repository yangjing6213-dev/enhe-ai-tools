import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { buildValidationSmokeTestPlan } from "../validation-launch-execution";
import { buildDeploymentCommandPlan } from "./deployment-command-planner";
import {
  readDeploymentConfig,
  readEnvExampleKeyNames
} from "./deployment-config-reader";
import { buildDeploymentRollbackPlan } from "./deployment-rollback-planner";
import type {
  EbosDeploymentCheckItem,
  EbosDeploymentCheckStatus,
  EbosProductionDeploymentPreflightReport
} from "./deployment-types";

const VALIDATION_ROUTES = [
  { route: "/validation/ai-prompt-kit", filePath: join("src", "app", "(zh-public)", "validation", "ai-prompt-kit", "page.tsx") },
  { route: "/en/validation/ai-prompt-kit", filePath: join("src", "app", "en", "validation", "ai-prompt-kit", "page.tsx") }
] as const;

export async function buildProductionDeploymentPreflightReport(options: {
  targetDate: string | Date;
  siteUrl: string;
  rootDir?: string;
  buildPassed?: boolean;
  configuredEnvKeys?: string[];
}): Promise<EbosProductionDeploymentPreflightReport> {
  const targetDate = toDateKey(options.targetDate);
  const rootDir = options.rootDir ?? process.cwd();
  const siteUrl = normalizeSiteUrl(options.siteUrl);
  const configSummary = await readDeploymentConfig({ rootDir });
  const buildChecks = await buildBuildChecks(rootDir, options.buildPassed);
  const routeChecks = await checkValidationRoutesInBuild({ rootDir });
  const envExampleKeys = await readEnvExampleKeyNames(rootDir);
  const environmentChecks = checkEnvironmentKeyNames({
    configuredKeys: options.configuredEnvKeys ?? Object.keys(process.env),
    envExampleKeys
  });
  const dockerChecks = checkDockerReadiness(configSummary);
  const nginxChecks = checkNginxReadiness(configSummary);
  const deploymentPlan = buildDeploymentCommandPlan({
    targetDate,
    siteUrl,
    hasDeployConfig: configSummary.dockerfileDetected && configSummary.dockerComposeDetected && configSummary.deployDocsDetected
  });
  const rollbackPlan = buildDeploymentRollbackPlan({ targetDate });
  const postDeploySmokeTests = buildValidationSmokeTestPlan({ targetDate, siteUrl })
    .filter((item) => item.url.startsWith(siteUrl))
    .map((item): EbosDeploymentCheckItem => ({
      id: `smoke-${item.id}`,
      category: "smoke",
      title: `${item.checkType} ${item.url}`,
      status: "manual_required",
      evidence: item.notes,
      command: `npx tsx scripts/check-ebos-validation-post-launch.ts --date ${targetDate} --site-url ${siteUrl}`
    }));
  const partialReport = {
    reportType: "production_deployment_preflight" as const,
    targetDate,
    generatedAt: new Date().toISOString(),
    siteUrl,
    validationRoutes: VALIDATION_ROUTES.map((item) => item.route),
    configSummary,
    buildChecks,
    routeChecks,
    environmentChecks,
    dockerChecks,
    nginxChecks,
    deploymentPlan,
    rollbackPlan,
    postDeploySmokeTests,
    readinessScore: 0,
    readinessStatus: "blocked" as const,
    blockers: [],
    warnings: [],
    nextActions: []
  };
  const blockers = buildBlockers(partialReport);
  const warnings = buildWarnings(partialReport);
  const readinessScore = calculateDeploymentReadinessScore(partialReport);
  const readinessStatus = buildReadinessStatus(partialReport, blockers, readinessScore);

  return {
    ...partialReport,
    readinessScore,
    readinessStatus,
    blockers,
    warnings,
    nextActions: buildNextActions(readinessStatus, blockers, warnings)
  };
}

export async function checkValidationRoutesInBuild(options: {
  rootDir?: string;
} = {}): Promise<EbosDeploymentCheckItem[]> {
  const rootDir = options.rootDir ?? process.cwd();

  return Promise.all(VALIDATION_ROUTES.map(async (route) => {
    const absolutePath = join(rootDir, route.filePath);
    const exists = await fileExists(absolutePath);
    return {
      id: `route-${route.route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`,
      category: "route",
      title: `Validation route ${route.route}`,
      status: exists ? "pass" : "fail",
      evidence: exists
        ? `${route.route} page file exists.`
        : `${route.route} page file is missing.`,
      filePath: route.filePath,
      nextAction: exists ? undefined : `Create or restore ${route.filePath} before production deployment.`
    };
  }));
}

export function checkEnvironmentKeyNames(options: {
  configuredKeys?: string[];
  envExampleKeys?: string[];
} = {}): EbosDeploymentCheckItem[] {
  const keys = new Set([...(options.configuredKeys ?? []), ...(options.envExampleKeys ?? [])]);
  const hasAny = (candidates: string[]) => candidates.some((key) => keys.has(key));

  return [
    envCheck("env-database-url", "DATABASE_URL", hasAny(["DATABASE_URL"]), "DATABASE_URL"),
    envCheck("env-auth-secret", "Auth secret key", hasAny(["AUTH_SECRET", "NEXTAUTH_SECRET"]), "AUTH_SECRET or NEXTAUTH_SECRET"),
    envCheck("env-site-url", "Site URL key", hasAny(["APP_URL", "NEXT_PUBLIC_APP_URL", "NEXTAUTH_URL", "EBOS_SITE_URL"]), "APP_URL, NEXT_PUBLIC_APP_URL, NEXTAUTH_URL, or EBOS_SITE_URL"),
    envCheck("env-smtp", "SMTP keys", hasAny(["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"]), "SMTP_* keys", "warning")
  ];
}

export function checkDockerReadiness(configSummary: {
  dockerfileDetected: boolean;
  dockerComposeDetected: boolean;
}): EbosDeploymentCheckItem[] {
  return [
    check("dockerfile", "docker", "Dockerfile detected", configSummary.dockerfileDetected ? "pass" : "warning", configSummary.dockerfileDetected ? "Dockerfile exists." : "Dockerfile is missing or not detected."),
    check("docker-compose", "docker", "Docker Compose detected", configSummary.dockerComposeDetected ? "pass" : "warning", configSummary.dockerComposeDetected ? "Docker Compose file exists." : "Docker Compose file is missing or not detected.")
  ];
}

export function checkNginxReadiness(configSummary: {
  nginxConfigDetected: boolean;
  deployDocsDetected: boolean;
}): EbosDeploymentCheckItem[] {
  return [
    check("nginx-config", "nginx", "Nginx config detected", configSummary.nginxConfigDetected ? "pass" : "warning", configSummary.nginxConfigDetected ? "Nginx config exists." : "Nginx config not detected; verify reverse proxy manually."),
    check("deploy-docs", "nginx", "Deploy docs detected", configSummary.deployDocsDetected ? "pass" : "warning", configSummary.deployDocsDetected ? "Deploy docs exist." : "Deploy docs are missing.")
  ];
}

export function calculateDeploymentReadinessScore(report: Pick<
  EbosProductionDeploymentPreflightReport,
  "buildChecks" | "routeChecks" | "environmentChecks" | "dockerChecks" | "nginxChecks" | "postDeploySmokeTests"
>) {
  const buildScore = scoreChecks(report.buildChecks);
  const routeScore = scoreChecks(report.routeChecks);
  const envScore = scoreChecks(report.environmentChecks);
  const dockerScore = scoreChecks(report.dockerChecks);
  const nginxScore = scoreChecks(report.nginxChecks);
  const smokeScore = report.postDeploySmokeTests.length > 0 ? 0.8 : 0;

  return Math.round(
    buildScore * 25
    + routeScore * 25
    + envScore * 15
    + dockerScore * 15
    + nginxScore * 10
    + smokeScore * 10
  );
}

export async function readLatestProductionDeploymentPreflightReport(options: {
  targetDate?: string | Date;
  reportsRoot?: string;
} = {}): Promise<{ filePath: string; report: EbosProductionDeploymentPreflightReport } | null> {
  const targetDate = options.targetDate ? toDateKey(options.targetDate) : null;
  const directory = join(options.reportsRoot ?? "reports/ebos", "deployment").replace(/\\/g, "/");

  if (targetDate) {
    const exactPath = `${directory}/${targetDate}-production-deployment-preflight.json`;
    const exact = await readPreflightFile(exactPath);
    if (exact) return { filePath: exactPath, report: exact };
  }

  try {
    const fileName = (await readdir(directory))
      .filter((name) => name.endsWith("-production-deployment-preflight.json"))
      .sort()
      .at(-1);
    if (!fileName) return null;
    const filePath = `${directory}/${fileName}`;
    const report = await readPreflightFile(filePath);
    return report ? { filePath, report } : null;
  } catch {
    return null;
  }
}

async function buildBuildChecks(rootDir: string, buildPassed?: boolean): Promise<EbosDeploymentCheckItem[]> {
  const packageJson = await readPackageJson(rootDir);
  const scripts = packageJson.scripts && typeof packageJson.scripts === "object" ? packageJson.scripts as Record<string, unknown> : {};
  const buildScriptExists = typeof scripts.build === "string";
  const buildEvidenceExists = buildPassed === true || await fileExists(join(rootDir, ".next", "BUILD_ID")) || await fileExists(join(rootDir, ".next", "standalone", "server.js"));

  return [
    check("build-script", "build", "package.json build script", buildScriptExists ? "pass" : "fail", buildScriptExists ? "package.json contains build script." : "package.json build script is missing.", "package.json", "npm run build"),
    check("build-evidence", "build", "Production build evidence", buildEvidenceExists ? "pass" : "manual_required", buildEvidenceExists ? "Build evidence exists from local build or explicit input." : "Run npm run build before production deployment.", undefined, "npm run build")
  ];
}

function buildBlockers(report: Pick<EbosProductionDeploymentPreflightReport, "buildChecks" | "routeChecks">) {
  return [
    ...report.buildChecks
      .filter((item) => item.status === "fail" || item.status === "manual_required")
      .map((item) => item.evidence),
    ...report.routeChecks
      .filter((item) => item.status === "fail")
      .map((item) => item.evidence)
  ];
}

function buildWarnings(report: Pick<EbosProductionDeploymentPreflightReport, "configSummary" | "environmentChecks" | "dockerChecks" | "nginxChecks" | "postDeploySmokeTests">) {
  return [
    ...report.configSummary.warnings,
    ...report.environmentChecks.filter((item) => item.status !== "pass").map((item) => item.evidence),
    ...report.dockerChecks.filter((item) => item.status !== "pass").map((item) => item.evidence),
    ...report.nginxChecks.filter((item) => item.status !== "pass").map((item) => item.evidence),
    ...(report.postDeploySmokeTests.length ? [] : ["Post-deploy smoke test plan is missing."])
  ];
}

function buildReadinessStatus(
  report: Pick<EbosProductionDeploymentPreflightReport, "dockerChecks" | "nginxChecks">,
  blockers: string[],
  readinessScore: number
): EbosProductionDeploymentPreflightReport["readinessStatus"] {
  if (blockers.length > 0) return "blocked";
  if (report.dockerChecks.some((item) => item.status !== "pass")) return "needs_fixes";
  if (report.nginxChecks.some((item) => item.id === "deploy-docs" && item.status !== "pass")) return "needs_fixes";
  if (readinessScore < 75) return "needs_fixes";
  return "ready_to_deploy";
}

function buildNextActions(
  status: EbosProductionDeploymentPreflightReport["readinessStatus"],
  blockers: string[],
  warnings: string[]
) {
  if (status === "blocked") {
    return [
      "Fix production deployment blockers before any deployment.",
      ...blockers.slice(0, 5)
    ];
  }

  if (status === "needs_fixes") {
    return [
      "Fix deployment config warnings before requesting production deployment.",
      ...warnings.slice(0, 5)
    ];
  }

  return [
    "Production preflight is ready_to_deploy, but this report does not deploy.",
    "Ask for explicit user confirmation before SSH or server commands.",
    "Run post-launch smoke tests only after deployment is confirmed."
  ];
}

function envCheck(
  id: string,
  title: string,
  present: boolean,
  evidenceLabel: string,
  missingStatus: EbosDeploymentCheckStatus = "manual_required"
): EbosDeploymentCheckItem {
  return check(
    id,
    "env",
    title,
    present ? "pass" : missingStatus,
    present ? `${evidenceLabel} key name is configured or documented.` : `${evidenceLabel} key name is missing or not documented.`
  );
}

function check(
  id: string,
  category: EbosDeploymentCheckItem["category"],
  title: string,
  status: EbosDeploymentCheckItem["status"],
  evidence: string,
  filePath?: string,
  commandText?: string
): EbosDeploymentCheckItem {
  return {
    id,
    category,
    title,
    status,
    evidence,
    ...(filePath ? { filePath } : {}),
    ...(commandText ? { command: commandText } : {})
  };
}

function scoreChecks(checks: EbosDeploymentCheckItem[]) {
  if (checks.length === 0) return 0;
  const score = checks.reduce((total, item) => {
    if (item.status === "pass") return total + 1;
    if (item.status === "warning" || item.status === "manual_required") return total + 0.5;
    return total;
  }, 0);
  return score / checks.length;
}

async function readPreflightFile(filePath: string) {
  try {
    const report = JSON.parse(await readFile(filePath, "utf8")) as EbosProductionDeploymentPreflightReport;
    return report.reportType === "production_deployment_preflight" ? report : null;
  } catch {
    return null;
  }
}

async function readPackageJson(rootDir: string) {
  try {
    return JSON.parse(await readFile(join(rootDir, "package.json"), "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.replace(/\/+$/, "");
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
