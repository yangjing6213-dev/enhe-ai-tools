import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { normalizeValidationResultInput } from "@/lib/ebos/validation";
import type { EbosValidationCaptureReport } from "@/lib/ebos/validation-capture";
import {
  buildExternalIntakeTemplate,
  writeExternalIntakeTemplateFiles
} from "@/lib/ebos/validation-intake";

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
  const capturePath = resolve(process.cwd(), `reports/ebos/validation/capture/${targetDate}-validation-capture-report.json`);
  const validationInputPath = resolve(process.cwd(), `reports/ebos/validation/inputs/${targetDate}-validation-input.json`);
  const captureReport = JSON.parse(await readFile(capturePath, "utf8")) as EbosValidationCaptureReport;
  const validationInput = normalizeValidationResultInput(JSON.parse(await readFile(validationInputPath, "utf8")));
  const template = buildExternalIntakeTemplate({
    targetDate,
    captureReport,
    validationInput,
    sourceCaptureReportPath: toPortablePath(relative(process.cwd(), capturePath)),
    sourceValidationInputPath: toPortablePath(relative(process.cwd(), validationInputPath))
  });
  const result = await writeExternalIntakeTemplateFiles({
    template,
    outputRoot: resolve(process.cwd(), "reports", "ebos"),
    force
  });

  console.log("EBOS external intake template generated:");
  console.log(`- Template JSON: ${result.templateJsonPath}`);
  console.log(`- Template Markdown: ${result.templateMarkdownPath}`);
  console.log(`- Editable input: ${result.inputPath}`);
  console.log(`- Channels count: ${template.channels.length}`);
  console.log(`- Plan count: ${template.planFields.length}`);
  console.log(`- Force overwrite input: ${force ? "yes" : "no"}`);
  if (result.skipped.length > 0) {
    console.log(`- Skipped existing files: ${result.skipped.join(", ")}`);
  }
  console.log("- Instructions:");
  for (const instruction of template.instructions) {
    console.log(`  - ${instruction}`);
  }
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
