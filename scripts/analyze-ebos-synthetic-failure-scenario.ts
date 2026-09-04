import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  analyzeSyntheticFailureScenario,
  buildSyntheticOptimizationPlan,
  renderSyntheticFailureAnalysisMarkdown,
  renderSyntheticFailureScenarioMarkdown,
  renderSyntheticOptimizationPlanMarkdown,
  type EbosSyntheticFailureScenario
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
  const outputDir = resolve(process.cwd(), "reports", "ebos", "external-publishing", "simulations");
  const scenarioPath = resolve(outputDir, `${targetDate}-synthetic-failure-scenario.json`);
  const scenarioMarkdownPath = resolve(outputDir, `${targetDate}-synthetic-failure-scenario.md`);
  const analysisJsonPath = resolve(outputDir, `${targetDate}-synthetic-failure-analysis.json`);
  const analysisMarkdownPath = resolve(outputDir, `${targetDate}-synthetic-failure-analysis.md`);
  const planJsonPath = resolve(outputDir, `${targetDate}-synthetic-optimization-plan.json`);
  const planMarkdownPath = resolve(outputDir, `${targetDate}-synthetic-optimization-plan.md`);
  const scenario = JSON.parse(await readFile(scenarioPath, "utf8")) as EbosSyntheticFailureScenario;
  const analysis = analyzeSyntheticFailureScenario(scenario, { simulatedScenarioPath: scenarioPath });
  const optimizationPlan = buildSyntheticOptimizationPlan(analysis);

  await mkdir(outputDir, { recursive: true });
  await writeFile(analysisJsonPath, `${JSON.stringify(analysis, null, 2)}\n`, "utf8");
  await writeFile(analysisMarkdownPath, `${renderSyntheticFailureAnalysisMarkdown(analysis)}\n`, "utf8");
  await writeFile(planJsonPath, `${JSON.stringify(optimizationPlan, null, 2)}\n`, "utf8");
  await writeFile(planMarkdownPath, `${renderSyntheticOptimizationPlanMarkdown(optimizationPlan)}\n`, "utf8");
  await writeFile(scenarioMarkdownPath, `${renderSyntheticFailureScenarioMarkdown(scenario, analysis, optimizationPlan)}\n`, "utf8");

  console.log("EBOS synthetic failure scenario analyzed:");
  console.log(`- Analysis JSON: ${analysisJsonPath}`);
  console.log(`- Analysis Markdown: ${analysisMarkdownPath}`);
  console.log(`- Optimization JSON: ${planJsonPath}`);
  console.log(`- Optimization Markdown: ${planMarkdownPath}`);
  console.log(`- likelyFailureReasons count: ${analysis.likelyFailureReasons.length}`);
  console.log(`- priorityFixes count: ${optimizationPlan.priorityFixes.length}`);
  console.log(`- nextExperimentActions count: ${optimizationPlan.nextSprintActions.length}`);
  console.log(`- synthetic: ${String(analysis.synthetic && optimizationPlan.synthetic)}`);
}

function formatDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

