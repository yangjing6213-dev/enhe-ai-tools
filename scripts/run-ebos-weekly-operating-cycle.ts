import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type CycleStep = {
  key: string;
  description: string;
  command: string;
  args: string[];
  required: boolean;
};

type CycleStepResult = CycleStep & {
  exitCode: number | null;
  status: "passed" | "failed";
  stdoutTail: string[];
  stderrTail: string[];
  errorMessage?: string;
};

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1] ?? null;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }
  return value;
}

function parseTargetDate() {
  const value = readArg("--date");
  if (!value) return toDateKey(new Date());
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid --date ${value}. Expected YYYY-MM-DD.`);
  }
  return value.slice(0, 10);
}

async function main() {
  const targetDate = parseTargetDate();
  const generatedAt = new Date().toISOString();
  const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
  const steps: CycleStep[] = [
    scriptStep(npxCommand, "validation_report", "Generate EBOS validation report", "generate-ebos-validation-report.ts", targetDate, true),
    scriptStep(npxCommand, "revenue_evidence", "Generate EBOS revenue evidence", "generate-ebos-revenue-evidence.ts", targetDate, true),
    scriptStep(npxCommand, "decision_report", "Generate EBOS decision report", "generate-ebos-decision-report.ts", targetDate, true),
    scriptStep(npxCommand, "weekly_report", "Generate EBOS weekly report", "generate-ebos-weekly-report.ts", targetDate, true),
    scriptStep(npxCommand, "monthly_review", "Generate EBOS monthly review", "generate-ebos-monthly-review.ts", targetDate, true),
    scriptStep(npxCommand, "external_real_data_status", "Check external real data status", "check-ebos-external-publish-results.ts", targetDate, true),
    scriptStep(npxCommand, "migration_release_safety", "Check migration release safety", "audit-ebos-migration-release-readiness.ts", targetDate, true),
    {
      key: "dirty_risk_state",
      description: "Read current dirty risk state",
      command: "git",
      args: ["status", "--short"],
      required: true
    }
  ];

  const results = steps.map(runStep);
  const passed = results.every((result) => result.status === "passed");
  const report = {
    reportType: "weekly_friday_operating_cycle",
    targetDate,
    generatedAt,
    cycleStatus: passed ? "passed" : "failed",
    localScript: "scripts/run-ebos-weekly-operating-cycle.ts",
    realSchedulerCreated: false,
    migrationExecuted: false,
    seedExecuted: false,
    deploymentExecuted: false,
    externalPublishingExecuted: false,
    backfillApplyExecuted: false,
    fakeDataCreated: false,
    forbiddenCommands: [
      "prisma migrate deploy",
      "prisma migrate dev",
      "prisma migrate reset",
      "prisma db push",
      "tsx prisma/seed.ts",
      "docker",
      "nginx",
      "ssh",
      "scripts/backfill-ebos-external-channel-data.ts --apply"
    ],
    steps: results,
    nextWeekActions: [
      "Keep safeToRunMigration=false until production/staging readonly checks, backup evidence, and explicit migration approval exist.",
      "Collect real external publishing metrics before any external data backfill apply.",
      "Keep package, seed, admin/API/core, and unknown dirty work in separate audits.",
      "Use this local script for Friday EBOS inspection; do not create a system scheduler without user confirmation."
    ],
    warnings: passed
      ? []
      : ["One or more weekly operating cycle steps failed; inspect step stderrTail before relying on the cycle output."]
  };

  const outputDir = resolve(process.cwd(), "reports", "ebos", "automation");
  const jsonPath = resolve(outputDir, `${targetDate}-weekly-friday-operating-cycle.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-weekly-friday-operating-cycle.md`);
  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, renderMarkdown(report), "utf8");

  console.log("EBOS weekly Friday operating cycle:");
  console.log(`- status: ${report.cycleStatus}`);
  console.log(`- migrationExecuted: ${report.migrationExecuted}`);
  console.log(`- seedExecuted: ${report.seedExecuted}`);
  console.log(`- deploymentExecuted: ${report.deploymentExecuted}`);
  console.log(`- backfillApplyExecuted: ${report.backfillApplyExecuted}`);
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);

  if (!passed) process.exitCode = 1;
}

function scriptStep(
  npxCommand: string,
  key: string,
  description: string,
  scriptName: string,
  targetDate: string,
  required: boolean
): CycleStep {
  return {
    key,
    description,
    command: npxCommand,
    args: ["tsx", `scripts/${scriptName}`, "--date", targetDate],
    required
  };
}

function runStep(step: CycleStep): CycleStepResult {
  const invocation = buildInvocation(step);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true
  });
  return {
    ...step,
    exitCode: result.status,
    status: result.status === 0 ? "passed" : "failed",
    stdoutTail: tailLines(result.stdout ?? "", 12),
    stderrTail: tailLines(result.stderr ?? "", 12),
    ...(result.error ? { errorMessage: result.error.message } : {})
  };
}

function buildInvocation(step: CycleStep) {
  if (process.platform !== "win32") {
    return { command: step.command, args: step.args };
  }

  const commandLine = [step.command, ...step.args].map(quoteWindowsArg).join(" ");
  return { command: "cmd.exe", args: ["/d", "/s", "/c", commandLine] };
}

function quoteWindowsArg(value: string) {
  if (!/[\s"]/u.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function tailLines(value: string, count: number) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(-count);
}

function renderMarkdown(report: {
  reportType: string;
  targetDate: string;
  generatedAt: string;
  cycleStatus: string;
  localScript: string;
  realSchedulerCreated: boolean;
  migrationExecuted: boolean;
  seedExecuted: boolean;
  deploymentExecuted: boolean;
  externalPublishingExecuted: boolean;
  backfillApplyExecuted: boolean;
  fakeDataCreated: boolean;
  steps: CycleStepResult[];
  nextWeekActions: string[];
  warnings: string[];
}) {
  const lines = [
    "# EBOS Weekly Friday Operating Cycle",
    "",
    `- reportType: \`${report.reportType}\``,
    `- targetDate: \`${report.targetDate}\``,
    `- generatedAt: \`${report.generatedAt}\``,
    `- cycleStatus: \`${report.cycleStatus}\``,
    `- localScript: \`${report.localScript}\``,
    `- realSchedulerCreated: \`${report.realSchedulerCreated}\``,
    "",
    "## Safety",
    "",
    `- migrationExecuted: \`${report.migrationExecuted}\``,
    `- seedExecuted: \`${report.seedExecuted}\``,
    `- deploymentExecuted: \`${report.deploymentExecuted}\``,
    `- externalPublishingExecuted: \`${report.externalPublishingExecuted}\``,
    `- backfillApplyExecuted: \`${report.backfillApplyExecuted}\``,
    `- fakeDataCreated: \`${report.fakeDataCreated}\``,
    "",
    "## Steps",
    "",
    ...report.steps.map((step) => `- ${step.key}: \`${step.status}\` (exitCode: \`${step.exitCode}\`)`),
    "",
    "## Next Week Actions",
    "",
    ...report.nextWeekActions.map((action) => `- ${action}`),
    "",
    "## Warnings",
    "",
    ...(report.warnings.length ? report.warnings.map((warning) => `- ${warning}`) : ["- none"]),
    ""
  ];
  return `${lines.join("\n")}\n`;
}

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
