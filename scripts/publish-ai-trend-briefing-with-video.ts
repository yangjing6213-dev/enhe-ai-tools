import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { materializeAiTrendBriefingArtifacts } from "./write-ai-trend-briefing-artifacts";
import type { AiTrendBriefingPublishInput } from "@/lib/ai-trends";
import type { GeneratedAiTrendVideo } from "./generate-ai-trend-briefing-video";
import { readFile } from "node:fs/promises";

const execFileAsync = promisify(execFile);

function readArg(name: string, argv: string[]) {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  const value = argv[index + 1] ?? null;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }
  return value;
}

type CommandRunner = (file: string, args: string[], options: { cwd: string; maxBuffer: number }) => Promise<{ stdout: string; stderr?: string }>;

export async function runAiTrendPublication(argv: string[], execute: CommandRunner = execFileAsync) {
  const inputFile = readArg("--input-file", argv);
  const date = readArg("--date", argv);
  const summaryFileArg = readArg("--summary-file", argv);
  const htmlFileArg = readArg("--file", argv);
  const mode = readArg("--mode", argv) ?? "published";
  const outputDir = readArg("--output-dir", argv);
  const baseName = readArg("--base-name", argv);

  const node = process.execPath;
  const root = process.cwd();
  let resolvedDate = date;
  let summaryFile = summaryFileArg ? resolve(root, summaryFileArg) : null;
  let htmlFile = htmlFileArg ? resolve(root, htmlFileArg) : null;

  if (inputFile) {
    const inputText = await readFile(resolve(root, inputFile), "utf8");
    const input = JSON.parse(inputText) as AiTrendBriefingPublishInput;
    const artifacts = await materializeAiTrendBriefingArtifacts(input, {
      outputDir: outputDir ? resolve(root, outputDir) : undefined,
      baseName: baseName ?? undefined
    });
    resolvedDate = artifacts.date;
    summaryFile = artifacts.summaryFile;
    htmlFile = artifacts.htmlFile;
  }

  if (!resolvedDate) throw new Error("Missing --date.");
  if (!summaryFile) throw new Error("Missing --summary-file.");
  if (!htmlFile) throw new Error("Missing --file.");

  const videoResultFile = resolve(root, "logs", `${resolvedDate}.video.result.json`);

  const renderArgs = [
    "--import",
    "tsx",
    resolve(root, "scripts", "generate-ai-trend-briefing-video.ts"),
    "--date",
    resolvedDate,
    "--summary-file",
    summaryFile,
    "--file",
    htmlFile,
    "--output-file",
    videoResultFile
  ];

  let video: GeneratedAiTrendVideo["video"] = null;
  let videoFailure: string | null = null;
  try {
    const renderResult = await execute(node, renderArgs, {
      cwd: root,
      maxBuffer: 10 * 1024 * 1024
    });
    const parsed = JSON.parse(renderResult.stdout.trim()) as GeneratedAiTrendVideo;
    const currentIssuePaths = [`/uploads/ai-trends/${resolvedDate}/`, `/api/uploads/ai-trends/${resolvedDate}/`];
    const posterBelongsToCurrentIssue = !parsed.video?.videoPosterUrl || currentIssuePaths.some((prefix) => parsed.video!.videoPosterUrl!.startsWith(prefix));
    if (parsed.success && parsed.video && currentIssuePaths.some((prefix) => parsed.video!.videoUrl.startsWith(prefix)) && posterBelongsToCurrentIssue) {
      video = parsed.video;
    } else {
      videoFailure = "No verified video asset for this briefing date.";
    }
  } catch {
    videoFailure = "Video generation failed; publishing the HTML report without a video.";
  }

  const publishArgs = [
    "--import",
    "tsx",
    resolve(root, "scripts", "publish-ai-trend-briefing-html.ts"),
    "--file",
    htmlFile,
    "--summary-file",
    summaryFile,
    "--mode",
    mode,
    "--include-in-topic-page",
    "true"
  ];

  if (argv.includes("--require-production-target")) publishArgs.push("--require-production-target");
  if (!video) publishArgs.push("--clear-video");
  if (video?.videoUrl) {
    publishArgs.push("--video-url", video.videoUrl);
  }
  if (video?.videoPosterUrl) {
    publishArgs.push("--video-poster-url", video.videoPosterUrl);
  }
  if (video?.videoTitle) {
    publishArgs.push("--video-title", video.videoTitle);
  }
  if (video?.videoDescription) {
    publishArgs.push("--video-description", video.videoDescription);
  }
  if (typeof video?.videoDurationSeconds === "number") {
    publishArgs.push("--video-duration-seconds", String(video.videoDurationSeconds));
  }

  const publishResult = await execute(node, publishArgs, {
    cwd: root,
    maxBuffer: 10 * 1024 * 1024
  });

  return { status: video ? "complete" : "partial", date: resolvedDate, mode, video, videoFailure, publishOutput: publishResult.stdout };
}

if (process.argv[1] && /publish-ai-trend-briefing-with-video\.ts$/i.test(process.argv[1])) {
  runAiTrendPublication(process.argv.slice(2))
    .then(({ publishOutput, ...result }) => {
      process.stdout.write(publishOutput);
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
