import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildSyntheticFailureScenario,
  renderSyntheticFailureScenarioMarkdown
} from "@/lib/ebos/synthetic-scenarios";

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
  if (!value) return formatDate(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid --date ${value}. Expected YYYY-MM-DD.`);
  }
  return value;
}

async function main() {
  const targetDate = parseTargetDate();
  const scenario = buildSyntheticFailureScenario({ targetDate });
  const outputDir = resolve(process.cwd(), "reports", "ebos", "external-publishing", "simulations");
  const jsonPath = resolve(outputDir, `${targetDate}-synthetic-failure-scenario.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-synthetic-failure-scenario.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(scenario, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderSyntheticFailureScenarioMarkdown(scenario)}\n`, "utf8");

  console.log("EBOS synthetic failure scenario generated:");
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
  console.log(`- synthetic: ${String(scenario.synthetic)}`);
  console.log(`- channels count: ${scenario.simulatedChannelResults.length}`);
  console.log(`- simulatedRevenue: ${scenario.simulatedFunnelSummary.simulatedRevenue}`);
  console.log(`- simulatedPaidOrders: ${scenario.simulatedFunnelSummary.simulatedPaidOrders}`);
  console.log("- warning: do not backfill as real data");
}

function formatDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

