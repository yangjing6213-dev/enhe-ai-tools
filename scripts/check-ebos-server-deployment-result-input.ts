import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateServerDeploymentResultInput } from "@/lib/ebos/deployment-server-intake";

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
  if (!value) return formatDateKey(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid --date ${value}. Expected YYYY-MM-DD.`);
  }
  return value;
}

async function main() {
  const targetDate = parseTargetDate();
  const input = readArg("--input");
  const inputPath = resolve(
    process.cwd(),
    input ?? `reports/ebos/deployment/execution/command-results/${targetDate}-server-deployment-result.json`
  );
  const payload = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
  const validation = validateServerDeploymentResultInput(payload);

  console.log("EBOS server deployment result input check:");
  console.log(`- input: ${inputPath}`);
  console.log(`- valid: ${validation.valid}`);
  console.log(`- canTransitionToDeployedPendingVerification: ${validation.canTransitionToDeployedPendingVerification}`);
  console.log(`- missingFields: ${validation.missingFields.length}`);
  console.log(`- warnings: ${validation.warnings.length}`);
  console.log(`- blockers: ${validation.blockers.length}`);
  if (validation.missingFields.length > 0) console.log(`- missingFieldsDetail: ${validation.missingFields.join("; ")}`);
  if (validation.warnings.length > 0) console.log(`- warningsDetail: ${validation.warnings.join("; ")}`);
  if (validation.blockers.length > 0) console.log(`- blockersDetail: ${validation.blockers.join("; ")}`);
  console.log("- status changed: no");
  console.log("- real deployment executed: no");
  console.log("- server/docker/nginx commands run: no");
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
