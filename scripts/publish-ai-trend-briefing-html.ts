import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "@/lib/db";
import {
  validateAiTrendBriefingInput,
  type AiTrendBriefingPublishInput
} from "@/lib/ai-trends";
import { absoluteUrl } from "@/lib/seo";

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

function assertMode(value: string | null): "draft" | "published" | "archived" {
  if (value === null) return "draft";
  if (value === "draft" || value === "published" || value === "archived") return value;
  throw new Error(`Invalid --mode ${value}. Expected draft, published, or archived.`);
}

function stripUtf8Bom(value: string) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function parseSummaryJson(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Summary JSON must be an object.");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.message === "Summary JSON must be an object.") {
      throw error;
    }
    throw new Error("Summary JSON could not be parsed.");
  }
}

async function main() {
  const file = readArg("--file");
  if (!file) {
    throw new Error("Missing --file path to AI trend briefing HTML file.");
  }

  const summaryFile = readArg("--summary-file");
  if (!summaryFile) {
    throw new Error("Missing --summary-file path to AI trend briefing summary JSON file.");
  }

  const [html, summaryText] = await Promise.all([
    readFile(resolve(file), "utf8"),
    readFile(resolve(summaryFile), "utf8")
  ]);
  const summary = parseSummaryJson(stripUtf8Bom(summaryText));
  const status = assertMode(readArg("--mode"));
  const data = validateAiTrendBriefingInput({
    ...summary,
    fullHtml: stripUtf8Bom(html),
    status
  } as AiTrendBriefingPublishInput);

  console.log(`Validated AI trend briefing: ${data.slug}`);
  console.log(`Title: ${data.title}`);
  const scenarioCount = data.demandBreakdowns.reduce((count, breakdown) => count + breakdown.scenarios.length, 0);
  console.log(`Sources: ${data.sourceSignals.length}`);
  console.log(`Demand breakdowns: ${data.demandBreakdowns.length} directions / ${scenarioCount} scenarios`);

  if (hasFlag("--dry-run")) {
    console.log("Dry run: database upsert skipped.");
    return;
  }

  const briefing = await prisma.aiTrendBriefing.upsert({
    where: { slug: data.slug },
    create: {
      date: data.date,
      slug: data.slug,
      title: data.title,
      summary: data.summary,
      coreConclusion: data.coreConclusion,
      publicHighlights: data.publicHighlights,
      fullHtml: data.fullHtml,
      sourceSignals: data.sourcePayload,
      status: data.status,
      publishedAt: data.publishedAt,
      isIncludedInTopicPage: data.isIncludedInTopicPage
    },
    update: {
      date: data.date,
      title: data.title,
      summary: data.summary,
      coreConclusion: data.coreConclusion,
      publicHighlights: data.publicHighlights,
      fullHtml: data.fullHtml,
      sourceSignals: data.sourcePayload,
      status: data.status,
      publishedAt: data.publishedAt,
      isIncludedInTopicPage: data.isIncludedInTopicPage
    },
    select: { id: true, slug: true, status: true }
  });

  console.log(`Upserted AI trend briefing: ${briefing.id}`);
  if (briefing.status === "published") {
    console.log(`Public URL: ${absoluteUrl(`/ai-trends/daily/${briefing.slug}`)}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
