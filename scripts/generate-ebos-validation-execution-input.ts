import { mkdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import {
  buildValidationExecutionInput,
  renderValidationExecutionMarkdown,
  type EbosValidationExecutionInput,
  type EbosValidationExecutionResultInputTemplate
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

function hasFlag(name: string) {
  return process.argv.includes(name);
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
  const force = hasFlag("--force");
  const executionDir = resolve(process.cwd(), "reports", "ebos", "validation", "execution");
  const inputDir = resolve(process.cwd(), "reports", "ebos", "validation", "inputs");
  const executionJsonPath = resolve(executionDir, `${targetDate}-validation-execution-input.json`);
  const executionMarkdownPath = resolve(executionDir, `${targetDate}-validation-execution-input.md`);
  const writableInputPath = resolve(inputDir, `${targetDate}-validation-input.json`);
  const executionInput = await buildValidationExecutionInput({
    targetDate,
    validationResultInputPath: toPortablePath(relative(process.cwd(), writableInputPath))
  });
  const writableInput = buildWritableValidationInput(executionInput);
  const inputWriteStatus = await writeWritableInput(writableInputPath, writableInput, force);

  await mkdir(executionDir, { recursive: true });
  await writeFile(executionJsonPath, `${JSON.stringify(executionInput, null, 2)}\n`, "utf8");
  await writeFile(executionMarkdownPath, `${renderValidationExecutionMarkdown(executionInput)}\n`, "utf8");

  console.log("EBOS validation execution input generated:");
  console.log(`- Execution JSON: ${executionJsonPath}`);
  console.log(`- Execution Markdown: ${executionMarkdownPath}`);
  console.log(`- Writable validation input: ${writableInputPath}`);
  console.log(`- Writable input status: ${inputWriteStatus}`);
  console.log(`- Plans count: ${executionInput.executionPlans.length}`);
  console.log(`- Required human fields: ${requiredHumanFields(executionInput).join(", ") || "none"}`);
  console.log(`- Suggested first action: ${suggestedFirstAction(executionInput)}`);
}

function buildWritableValidationInput(input: EbosValidationExecutionInput) {
  return {
    trackerPath: input.validationTrackerPath,
    targetDate: input.targetDate,
    results: input.executionPlans.map((plan): EbosValidationExecutionResultInputTemplate => ({
      ...plan.resultInputTemplate
    }))
  };
}

async function writeWritableInput(filePath: string, input: unknown, force: boolean) {
  await mkdir(resolve(filePath, ".."), { recursive: true });
  const exists = await fileExists(filePath);
  if (exists && !force) {
    return "skipped_existing_file";
  }
  await writeFile(filePath, `${JSON.stringify(input, null, 2)}\n`, "utf8");
  return exists ? "overwritten_by_force" : "created";
}

async function fileExists(filePath: string) {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

function requiredHumanFields(input: EbosValidationExecutionInput) {
  return [...new Set(input.executionPlans.flatMap((plan) => plan.trackingFields
    .filter((field) => field.required)
    .map((field) => field.key)))];
}

function suggestedFirstAction(input: EbosValidationExecutionInput) {
  const preferred = input.executionPlans.find((plan) => plan.targetDirection.includes("AI Prompt Kit"))
    ?? input.executionPlans[0];
  return preferred?.humanTasks[0] ?? "Fill validation-input.json after the first observed validation action.";
}

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function toPortablePath(value: string) {
  return value.replace(/\\/g, "/");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
