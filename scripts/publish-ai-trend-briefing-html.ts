import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "@/lib/db";
import {
  validateAiTrendBriefingInput,
  type AiTrendBriefingPublishInput
} from "@/lib/ai-trends";
import { normalizeMediaSrc } from "@/lib/media";
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

function isLocalAppUrl(value: string | undefined) {
  if (!value?.trim()) return true;
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname);
  } catch {
    return true;
  }
}

function normalizeOptionalArg(name: string) {
  const value = readArg(name);
  if (value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function parseOptionalBooleanArg(name: string) {
  const value = normalizeOptionalArg(name);
  if (value === null) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`Invalid ${name} ${value}. Expected true or false.`);
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

  const videoUrl = normalizeOptionalArg("--video-url");
  const videoTitle = normalizeOptionalArg("--video-title");
  const videoDescription = normalizeOptionalArg("--video-description");
  const videoPosterUrl = normalizeOptionalArg("--video-poster-url");
  const videoDurationSecondsArg = normalizeOptionalArg("--video-duration-seconds");
  const includeInTopicPage = parseOptionalBooleanArg("--include-in-topic-page");
  const dryRun = hasFlag("--dry-run");
  if (hasFlag("--require-production-target") && (isLocalAppUrl(process.env.APP_URL) || isLocalAppUrl(process.env.NEXT_PUBLIC_APP_URL))) {
    throw new Error("Production publishing requires non-local APP_URL and NEXT_PUBLIC_APP_URL.");
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
    ...(videoUrl ? { videoUrl: normalizeMediaSrc(videoUrl) } : {}),
    ...(videoTitle ? { videoTitle } : {}),
    ...(videoDescription ? { videoDescription } : {}),
    ...(videoPosterUrl ? { videoPosterUrl: normalizeMediaSrc(videoPosterUrl) } : {}),
    ...(videoDurationSecondsArg ? { videoDurationSeconds: Number.parseInt(videoDurationSecondsArg, 10) } : {}),
    ...(typeof includeInTopicPage === "boolean" ? { isIncludedInTopicPage: includeInTopicPage } : {}),
    ...(hasFlag("--clear-video") ? {
      videoUrl: null, videoTitle: null, videoDescription: null, videoPosterUrl: null, videoDurationSeconds: null,
    } : {}),
    status
  } as AiTrendBriefingPublishInput);

  console.log(`Validated AI trend briefing: ${data.slug}`);
  console.log(`Title: ${data.title}`);
  const scenarioCount = data.demandBreakdowns.reduce((count, breakdown) => count + breakdown.scenarios.length, 0);
  console.log(`Sources: ${data.sourceSignals.length}`);
  console.log(`Demand breakdowns: ${data.demandBreakdowns.length} directions / ${scenarioCount} scenarios`);
  console.log(`Video: ${data.videoUrl ? "attached" : "none"}`);
  console.log(`Topic page: ${data.isIncludedInTopicPage ? "included" : "excluded"}`);

  if (dryRun) {
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
      videoUrl: data.videoUrl,
      videoTitle: data.videoTitle,
      videoDescription: data.videoDescription,
      videoPosterUrl: data.videoPosterUrl,
      videoDurationSeconds: data.videoDurationSeconds,
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
      videoUrl: data.videoUrl,
      videoTitle: data.videoTitle,
      videoDescription: data.videoDescription,
      videoPosterUrl: data.videoPosterUrl,
      videoDurationSeconds: data.videoDurationSeconds,
      status: data.status,
      publishedAt: data.publishedAt,
      isIncludedInTopicPage: data.isIncludedInTopicPage
    },
    select: { id: true, slug: true, status: true }
  });

  console.log(`Upserted AI trend briefing: ${briefing.id}`);
  if (briefing.status === "published") {
    console.log(`Public URL: ${absoluteUrl(`/ai-trends/daily/${briefing.slug}`)}`);
    await triggerAiTrendRevalidation();
  }
}

async function triggerAiTrendRevalidation() {
  const appUrl = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    console.log("Skipped AI trends revalidation: APP_URL is not configured.");
    return;
  }

  const token = process.env.AI_TRENDS_REVALIDATE_TOKEN?.trim();

  try {
    const response = await fetch(new URL("/api/revalidate/ai-trends", appUrl), {
      method: "POST",
      headers: token ? { "x-revalidate-token": token } : undefined
    });

    if (!response.ok) {
      const message = await response.text();
      console.log(`AI trends revalidation failed: ${response.status} ${message}`);
      return;
    }

    console.log("AI trends revalidation triggered.");
  } catch (error) {
    console.log(
      `AI trends revalidation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    if (!hasFlag("--dry-run")) await prisma.$disconnect();
  });
