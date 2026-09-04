import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createEvidenceFileName,
  getEvidenceDirectory,
  wrapHealthSnapshotEvidence
} from "@/lib/ebos/evidence";
import {
  calculateWebsiteHealthScore,
  createCommandHealthResult,
  renderWebsiteHealthMarkdown,
  runEbosSmokeChecks,
  summarizeCommandHealthResults,
  type EbosCommandHealthResult,
  type EbosWebsiteHealthCheckKey
} from "@/lib/ebos/health";
import { formatLocalDate } from "@/lib/ebos/weekly/date-format";

type CommandSpec = {
  key: EbosWebsiteHealthCheckKey;
  command: string;
  run: boolean;
};

const COMMANDS: CommandSpec[] = [
  { key: "lint", command: "npm run lint", run: true },
  { key: "typecheck", command: "npm run typecheck", run: true },
  { key: "build", command: "npm run build", run: true },
  { key: "ebos_tests", command: "npm run test -- src/lib/ebos", run: true },
  { key: "unit_tests", command: "npm test", run: false },
  { key: "playwright_smoke", command: "npm run test:e2e", run: false },
  { key: "lighthouse", command: "lighthouse", run: false }
];

async function main() {
  const commands: EbosCommandHealthResult[] = [];

  for (const spec of COMMANDS) {
    if (spec.run) {
      commands.push(await runCommand(spec));
    } else {
      commands.push(createCommandHealthResult({
        key: spec.key,
        command: spec.command,
        skipped: true,
        stderr: "Step 3 records this check as skipped until the command is wired into automated health snapshots."
      }));
    }
  }
  commands.push(...await runEbosSmokeChecks({
    readProductSlugs: readPublishedProductSlugs
  }));

  const snapshot = {
    generatedAt: new Date(),
    commands
  };
  const score = calculateWebsiteHealthScore(snapshot);
  const markdown = renderWebsiteHealthMarkdown(snapshot, score);
  const outputDir = resolve(process.cwd(), "reports", "ebos", "health");
  const filePrefix = formatLocalDate(snapshot.generatedAt);
  const jsonPath = resolve(outputDir, `${filePrefix}-health-snapshot.json`);
  const markdownPath = resolve(outputDir, `${filePrefix}-health-snapshot.md`);
  const evidenceOutputDir = resolve(process.cwd(), getEvidenceDirectory("health_snapshot"));
  const evidenceJsonPath = resolve(evidenceOutputDir, createEvidenceFileName("health_snapshot", filePrefix, "json"));
  const evidenceEnvelope = wrapHealthSnapshotEvidence({ snapshot, score }, {
    targetDate: filePrefix,
    generatedAt: snapshot.generatedAt,
    generator: "scripts/generate-ebos-health-snapshot.ts",
    sourceFiles: [jsonPath, markdownPath],
    siteUrl: process.env.EBOS_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL
  });
  const summary = summarizeCommandHealthResults(commands);

  await mkdir(outputDir, { recursive: true });
  await mkdir(evidenceOutputDir, { recursive: true });
  await writeFile(jsonPath, JSON.stringify({ snapshot, score }, null, 2), "utf8");
  await writeFile(markdownPath, markdown, "utf8");
  await writeFile(evidenceJsonPath, JSON.stringify(evidenceEnvelope, null, 2), "utf8");

  console.log("EBOS health snapshot generated:");
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
  console.log(`- Evidence JSON: ${evidenceJsonPath}`);
  console.log("- Next: run npx tsx scripts/index-ebos-evidence.ts to refresh the EBOS evidence catalog.");
  console.log(`- Score: ${score.score}`);
  console.log(`- Grade: ${score.grade}`);
  console.log(`- Confidence: ${score.confidence}`);
  console.log("- Failed checks:");
  if (summary.failedChecks.length === 0) {
    console.log("  - none");
  } else {
    for (const check of summary.failedChecks) {
      console.log(`  - ${check.key}: ${check.summary}`);
    }
  }
  console.log("- Top recommendations:");
  for (const item of score.recommendations.slice(0, 5)) {
    console.log(`  - [${item.priority}] ${item.message}`);
  }
  console.log("- Smoke check URLs:");
  for (const item of commands.filter((command) => ["sitemap", "robots", "homepage", "key_product_pages"].includes(command.key))) {
    console.log(`  - [${item.status}] ${item.key}: ${item.url || "no url"}`);
  }
}

function runCommand(spec: CommandSpec) {
  const startedAt = Date.now();

  return new Promise<EbosCommandHealthResult>((resolveResult) => {
    const child = spawn(spec.command, {
      cwd: process.cwd(),
      env: process.env,
      shell: true
    });
    const stdout: string[] = [];
    const stderr: string[] = [];

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout.push(chunk.toString("utf8"));
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr.push(chunk.toString("utf8"));
    });
    child.on("error", (error) => {
      resolveResult(createCommandHealthResult({
        key: spec.key,
        command: spec.command,
        exitCode: 1,
        stderr: error.message,
        durationMs: Date.now() - startedAt
      }));
    });
    child.on("close", (code) => {
      resolveResult(createCommandHealthResult({
        key: spec.key,
        command: spec.command,
        exitCode: code,
        stdout: stdout.join(""),
        stderr: stderr.join(""),
        durationMs: Date.now() - startedAt
      }));
    });
  });
}

async function readPublishedProductSlugs() {
  const { prisma } = await import("@/lib/db");
  const tools = await prisma.tool.findMany({
    where: { status: "published" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 5,
    select: { slug: true }
  });
  return tools.map((tool) => tool.slug);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
