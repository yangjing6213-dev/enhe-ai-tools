import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  attributeValidationResultsByChannel,
  collectValidationInputWarnings,
  normalizeValidationResultInput,
  summarizeValidationInputCompleteness,
  validateValidationInput,
  type EbosValidationResultInput
} from "@/lib/ebos/validation";

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
  const inputPath = resolve(
    process.cwd(),
    readArg("--input") ?? `reports/ebos/validation/inputs/${targetDate}-validation-input.json`
  );
  const rawInput = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
  const validation = validateValidationInput(rawInput);
  const warnings = collectValidationInputWarnings(rawInput);
  const completeness = summarizeValidationInputCompleteness(rawInput);
  const normalized = normalizeValidationResultInput(rawInput);

  console.log("EBOS validation input check:");
  console.log(`- Input: ${inputPath}`);
  console.log(`- Validation: ${validation.isValid ? "pass" : "fail"}`);
  console.log(`- Completeness: ${completeness.completenessPercent}% (${completeness.level})`);
  console.log(`- Plans: ${completeness.totalPlans}`);
  console.log(`- Plans with signal: ${completeness.plansWithAnySignal}`);
  console.log(`- Errors: ${validation.errors.length}`);
  console.log(`- Warnings: ${warnings.length}`);
  console.log("");
  console.log("Per-plan status:");
  for (const result of normalized.results) {
    const suggestions = completeness.suggestedFieldsToFill[result.planId] ?? [];
    console.log(`- ${result.planId}: status=${result.status}; suggestedFields=${suggestions.join(", ") || "none"}`);
  }
  console.log("");
  console.log("Data quality warnings:");
  if (validation.errors.length === 0 && warnings.length === 0) {
    console.log("- none");
  } else {
    for (const issue of [...validation.errors, ...warnings]) {
      console.log(`- ${issue.severity}: ${issue.code}${issue.planId ? ` [${issue.planId}]` : ""}: ${issue.message}`);
    }
  }
  console.log("");
  console.log("Channel attribution summary:");
  for (const result of normalized.results) {
    console.log(`- ${result.planId}: ${summarizeChannels(result)}`);
  }

  if (!validation.isValid) {
    process.exitCode = 1;
  }
}

function summarizeChannels(result: EbosValidationResultInput) {
  return attributeValidationResultsByChannel(result).channels
    .map((channel) => `${channel.channel}=${channel.status}`)
    .join("; ");
}

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
