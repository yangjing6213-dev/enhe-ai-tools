import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  EbosValidationExecutionInput,
  EbosValidationExecutionPlan
} from "@/lib/ebos/validation-execution";

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

export function renderFirstValidationRunbookMarkdown(input: EbosValidationExecutionInput) {
  return [
    "# EBOS First Validation Run Runbook",
    "",
    `Target date: ${input.targetDate}`,
    `Decision report: ${input.decisionReportPath}`,
    `Validation tracker: ${input.validationTrackerPath}`,
    `Validation input to fill: ${input.validationResultInputPath}`,
    "",
    "## Main validation direction",
    mainValidationDirection(input),
    "",
    "## Validation plans",
    input.executionPlans.map(renderPlan).join("\n\n"),
    "",
    "## Codex tasks",
    list(input.executionPlans.flatMap((plan) => plan.codexTasks.map((task) => `${plan.title}: ${task}`))),
    "",
    "## User tasks",
    list(input.executionPlans.flatMap((plan) => plan.humanTasks.map((task) => `${plan.title}: ${task}`))),
    "",
    "## Fields to fill",
    list(input.executionPlans.map((plan) => `${plan.title}: ${fieldsForPlan(plan).join(", ") || "none"}`)),
    "",
    "## 3-day / 7-day success rules",
    list(input.executionPlans.flatMap((plan) => [
      `${plan.title} 3-day rule: continue collecting if any views, clicks, messages, replies, leads, or orders are observed; adjust copy/CTA if there is exposure without clicks.`,
      `${plan.title} 7-day rule: continue or scale only with clean paid orders, presale orders, qualified leads, or repeated high-intent messages; adjust or pause if no observed demand signal.`
    ])),
    "",
    "## What not to do",
    list([
      "Do not fabricate CTA clicks, leads, orders, revenue, refunds, or feedback.",
      "Do not call external APIs from this runbook.",
      "Do not add Prisma migrations or admin UI.",
      "Do not treat empty templates as failed validation.",
      "Do not enter Validation Result into the Evidence Catalog."
    ]),
    "",
    "## Result recording rules",
    list(input.resultRecordingRules),
    "",
    "## Next report usage",
    list([
      "Fill only observed values in validation-input.json.",
      "Run check-ebos-validation-input before generating the validation result report.",
      "Run generate-ebos-validation-report after the first observed results are recorded.",
      "Weekly, Monthly, and Decision reports should use the generated validation result report for the next prioritization."
    ]),
    "",
    "## Warnings",
    list(input.warnings.map((warning) => `${warning.code}: ${warning.message}`))
  ].join("\n");
}

async function main() {
  const targetDate = parseTargetDateKey();
  const executionInputPath = resolve(
    process.cwd(),
    `reports/ebos/validation/execution/${targetDate}-validation-execution-input.json`
  );
  const outputPath = resolve(
    process.cwd(),
    `reports/ebos/validation/runbooks/${targetDate}-first-validation-runbook.md`
  );
  const executionInput = await readExecutionInput(executionInputPath);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${renderFirstValidationRunbookMarkdown(executionInput)}\n`, "utf8");

  console.log("EBOS first validation runbook generated:");
  console.log(`- Runbook: ${outputPath}`);
  console.log(`- Execution input: ${executionInputPath}`);
  console.log(`- Plans count: ${executionInput.executionPlans.length}`);
  console.log(`- Main direction: ${mainValidationDirection(executionInput)}`);
}

async function readExecutionInput(filePath: string): Promise<EbosValidationExecutionInput> {
  const input = JSON.parse(await readFile(filePath, "utf8")) as EbosValidationExecutionInput;
  if (input.inputType !== "validation_execution_input") {
    throw new Error(`Invalid validation execution input: ${filePath}`);
  }
  return input;
}

function renderPlan(plan: EbosValidationExecutionPlan, index: number) {
  const title = cleanText(plan.title);
  return [
    `### ${index + 1}. ${title}`,
    "",
    `Target direction: ${cleanText(plan.targetDirection)}`,
    plan.targetProduct ? `Target product: ${cleanText(plan.targetProduct)}` : "",
    `Method: ${plan.validationMethod}`,
    `Objective: ${cleanText(plan.objective)}`,
    `Hypothesis: ${cleanText(plan.hypothesis)}`,
    `Success metric: ${cleanText(plan.successMetric)}`,
    `Minimum threshold: ${cleanText(plan.minimumSuccessThreshold)}`,
    `Duration: ${plan.durationDays} days`,
    "",
    "What this plan does:",
    list(plan.acceptanceCriteria),
    "",
    "Codex tasks:",
    list(plan.codexTasks),
    "",
    "User tasks:",
    list(plan.humanTasks),
    "",
    "Fields to fill:",
    list(fieldsForPlan(plan)),
    "",
    "3-day check:",
    "- Check whether exposure, clicks, messages, replies, leads, or orders have appeared.",
    "- If there is exposure without clicks, adjust title, cover, CTA, offer clarity, or trust elements.",
    "",
    "7-day decision:",
    "- Continue or scale only when observed paid orders, presale orders, qualified leads, or repeated high-intent messages exist.",
    "- Adjust when there is engagement without orders or leads.",
    "- Keep not_started when no real result has been recorded."
  ].filter(Boolean).join("\n");
}

function mainValidationDirection(input: EbosValidationExecutionInput) {
  return cleanText(input.executionPlans[0]?.targetDirection ?? "No validation plan available");
}

function fieldsForPlan(plan: EbosValidationExecutionPlan) {
  const templateFields = Object.keys(plan.resultInputTemplate)
    .filter((key) => !["planId", "status", "channelResults", "userFeedback"].includes(key));
  return [...new Set([
    ...plan.trackingFields.map((field) => field.key),
    ...templateFields
  ])];
}

function list(items: string[]) {
  const cleaned = items.map(cleanText).filter(Boolean);
  return cleaned.length ? cleaned.map((item) => `- ${item}`).join("\n") : "- none";
}

function cleanText(value: string) {
  return value.replace(/[\u0000-\u001F\u007F]+/g, " ").trim();
}

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
