import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { validateAiTrendBriefingInput, type AiTrendBriefingPublishInput } from "@/lib/ai-trends";
import { normalizeMediaSrc } from "@/lib/media";
import type { AiTrendVideoProps, AiTrendVideoScene } from "../remotion/ai-trend-briefing/types";

export type GeneratedAiTrendVideo = {
  success: boolean;
  video: {
    videoUrl: string;
    videoTitle: string;
    videoDescription: string;
    videoPosterUrl: string | null;
    videoDurationSeconds: number | null;
  } | null;
  error?: string;
};

type ParsedArgs = {
  date: string;
  summaryFile: string | null;
  htmlFile: string | null;
  outputFile: string | null;
  outputDir: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
  durationSeconds: string | null;
};

export function parseArgs(argv: string[]): ParsedArgs {
  const read = (name: string) => {
    const index = argv.indexOf(name);
    if (index === -1) return null;
    const value = argv[index + 1] ?? null;
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${name}.`);
    }
    return value;
  };

  const date = read("--date");
  if (!date) throw new Error("Missing --date.");

  return {
    date,
    summaryFile: read("--summary-file"),
    htmlFile: read("--file"),
    outputFile: read("--output-file"),
    outputDir: read("--output-dir"),
    videoUrl: read("--video-url"),
    posterUrl: read("--poster-url"),
    durationSeconds: read("--duration-seconds")
  };
}

export function buildVideoSummaryPayload(input: AiTrendBriefingPublishInput) {
  const data = validateAiTrendBriefingInput(input);
  return {
    date: data.slug,
    title: data.title,
    coreConclusion: data.coreConclusion,
    summary: data.summary,
    directions: data.demandBreakdowns.slice(0, 4).map((item) => item.direction),
    sourceCount: data.sourceSignals.length,
    demandBreakdowns: data.demandBreakdowns
  };
}

function normalizeCliJsonText(value: string) {
  return stripUtf8Bom(value).trim();
}

function stripUtf8Bom(value: string) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

export function buildVideoProps(input: AiTrendBriefingPublishInput): AiTrendVideoProps {
  const data = validateAiTrendBriefingInput(input);
  const summary = buildVideoSummaryPayload(input);
  const scenes: AiTrendVideoScene[] = summary.demandBreakdowns.slice(0, 3).map((breakdown) => ({
    title: breakdown.direction,
    body:
      breakdown.summary ||
      breakdown.scenarios
        .slice(0, 2)
        .map((scenario) => `${scenario.name}：${scenario.aiValue}`)
        .join(" ")
  }));

  if (!scenes.length) {
    scenes.push({
      title: "核心结论",
      body:
        data.publicHighlights.slice(0, 2).join("；") ||
        data.summary ||
        data.coreConclusion
    });
  }

  const directions =
    summary.directions.length > 0 ? summary.directions : ["核心结论", "公开摘要", "落地机会"];

  return {
    date: summary.date,
    title: summary.title,
    coreConclusion: summary.coreConclusion,
    summary: summary.summary,
    sourceCount: summary.sourceCount,
    directions,
    scenes
  };
}

async function ensureDir(path: string) {
  await mkdir(path, { recursive: true });
}

function resolveLocalBrowserExecutable() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function inferPublicAssetPaths(date: string, outputDir?: string | null) {
  const baseDir = outputDir
    ? resolve(outputDir)
    : resolve(process.cwd(), "public", "uploads", "ai-trends", date);

  return {
    baseDir,
    mp4File: join(baseDir, "briefing.mp4"),
    posterFile: join(baseDir, "briefing-poster.png"),
    resultJsonFile: join(baseDir, "briefing-video.json"),
    publicVideoUrl:
      normalizeMediaSrc(`/uploads/ai-trends/${date}/briefing.mp4`) ?? `/uploads/ai-trends/${date}/briefing.mp4`,
    publicPosterUrl:
      normalizeMediaSrc(`/uploads/ai-trends/${date}/briefing-poster.png`) ??
      `/uploads/ai-trends/${date}/briefing-poster.png`
  };
}

async function renderVideoAssets(props: AiTrendVideoProps, date: string, outputDir?: string | null) {
  const paths = inferPublicAssetPaths(date, outputDir);
  await ensureDir(paths.baseDir);
  const browserExecutable = resolveLocalBrowserExecutable();

  const entryPoint = resolve(process.cwd(), "remotion", "ai-trend-briefing", "index.ts");
  const serveUrl = await bundle({
    entryPoint,
    webpackOverride: (config) => config
  });

  const composition = await selectComposition({
    serveUrl,
    id: "AiTrendBriefing",
    inputProps: props,
    browserExecutable,
    chromeMode: "chrome-for-testing"
  });

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: paths.mp4File,
    inputProps: props,
    browserExecutable,
    chromeMode: "chrome-for-testing"
  });

  await renderStill({
    composition,
    serveUrl,
    output: paths.posterFile,
    frame: 30,
    inputProps: props,
    browserExecutable,
    chromeMode: "chrome-for-testing"
  });

  return paths;
}

export async function runVideoGeneration(
  input: AiTrendBriefingPublishInput,
  options: {
    gracefulFailure?: boolean;
    videoUrl?: string | null;
    posterUrl?: string | null;
    durationSeconds?: number | null;
    outputFile?: string | null;
    outputDir?: string | null;
    disableRender?: boolean;
  } = {}
): Promise<GeneratedAiTrendVideo> {
  try {
    const props = buildVideoProps(input);

    let videoUrl = normalizeMediaSrc(options.videoUrl ?? input.videoUrl ?? "");
    let posterUrl = normalizeMediaSrc(options.posterUrl ?? input.videoPosterUrl ?? "");

    if (!videoUrl && !options.disableRender) {
      const rendered = await renderVideoAssets(props, props.date, options.outputDir);
      videoUrl = rendered.publicVideoUrl;
      posterUrl = rendered.publicPosterUrl;

      const targetFile = options.outputFile ? resolve(options.outputFile) : rendered.resultJsonFile;
      await ensureDir(dirname(targetFile));
      await writeFile(
        targetFile,
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            videoUrl,
            posterUrl
          },
          null,
          2
        ),
        "utf8"
      );
    }

    if (!videoUrl) {
      throw new Error("No renderable video URL or rendered MP4 is available.");
    }

    return {
      success: true,
      video: {
        videoUrl,
        videoTitle: `${props.title}视频简报`,
        videoDescription: props.coreConclusion,
        videoPosterUrl: posterUrl ?? null,
        videoDurationSeconds:
          options.durationSeconds ??
          (typeof input.videoDurationSeconds === "number" ? input.videoDurationSeconds : props.scenes.length * 3)
      }
    };
  } catch (error) {
    if (options.gracefulFailure) {
      return {
        success: false,
        video: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }

    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.summaryFile) {
    throw new Error("Missing --summary-file.");
  }

  const summaryText = await readFile(resolve(args.summaryFile), "utf8");
  const summary = JSON.parse(normalizeCliJsonText(summaryText)) as AiTrendBriefingPublishInput;
  const html = args.htmlFile ? await readFile(resolve(args.htmlFile), "utf8") : null;

  const result = await runVideoGeneration(
    {
      ...summary,
      ...(html ? { fullHtml: stripUtf8Bom(html) } : {})
    },
    {
      gracefulFailure: true,
      videoUrl: args.videoUrl,
      posterUrl: args.posterUrl,
      durationSeconds: args.durationSeconds ? Number.parseInt(args.durationSeconds, 10) : null,
      outputFile: args.outputFile,
      outputDir: args.outputDir
    }
  );

  if (args.outputFile) {
    await ensureDir(dirname(resolve(args.outputFile)));
    await writeFile(resolve(args.outputFile), JSON.stringify(result, null, 2), "utf8");
  }

  console.log(JSON.stringify(result, null, 2));
  if (!result.success) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && /generate-ai-trend-briefing-video\.ts$/i.test(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
