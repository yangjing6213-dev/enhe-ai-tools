import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vi } from "vitest";
import {
  buildVideoProps,
  buildVideoSummaryPayload,
  parseArgs,
  runVideoGeneration
} from "./generate-ai-trend-briefing-video";

vi.mock("@remotion/bundler", () => ({ bundle: vi.fn().mockResolvedValue("http://localhost/render") }));
vi.mock("@remotion/renderer", () => ({
  selectComposition: vi.fn().mockResolvedValue({}),
  renderMedia: vi.fn().mockResolvedValue(undefined),
  renderStill: vi.fn().mockResolvedValue(undefined)
}));

const validInput = {
  date: "2026-06-30",
  title: "AI 需求趋势分析",
  summary: "公开摘要",
  coreConclusion: "用户更愿意为节省时间和提升交付质量的 AI 工作流买单。",
  publicHighlights: ["工作效率最高", "视频生成持续高热"],
  fullHtml: "<article><h1>AI 需求趋势分析</h1><p>完整内容</p></article>",
  sourceSignals: [
    {
      title: "Google Trends",
      url: "https://trends.google.com/trends/",
      sourceType: "search trend",
      observedSignal: "AI demand remains visible."
    }
  ],
  demandBreakdowns: [
    {
      direction: "工作效率",
      heat: 96,
      summary: "高频任务最先落地。",
      scenarios: [
        {
          name: "会议纪要",
          heat: 92,
          urgency: "A",
          typicalUsers: ["运营"],
          painPoint: "会后整理耗时。",
          representativeScenarios: ["录音转纪要"],
          aiValue: "自动整理和分发。",
          productOpportunity: "会议助手",
          developmentPriority: "A",
          evidenceSignals: ["search trend"]
        }
      ]
    }
  ]
};

describe("generate-ai-trend-briefing-video script helpers", () => {
  it("parses required date arg", () => {
    expect(parseArgs(["--date", "2026-06-30"])).toMatchObject({ date: "2026-06-30" });
    expect(() => parseArgs([])).toThrow(/date/i);
  });

  it("parses an optional HTML file path for summary-only automation artifacts", () => {
    expect(parseArgs(["--date", "2026-06-30", "--summary-file", "summary.json", "--file", "briefing.html"])).toMatchObject({
      date: "2026-06-30",
      summaryFile: "summary.json",
      htmlFile: "briefing.html"
    });
  });

  it("builds a compact video summary payload from briefing input", () => {
    expect(buildVideoSummaryPayload(validInput).title).toBe(validInput.title);
    expect(buildVideoSummaryPayload(validInput).directions).toEqual(["工作效率"]);
  });

  it("builds remotion props from briefing input", () => {
    const props = buildVideoProps(validInput);
    expect(props.title).toBe(validInput.title);
    expect(props.scenes[0]?.title).toBe("工作效率");
    expect(props.scenes[0]?.heat).toBeUndefined();
  });

  it("does not invent a heat score when a report has no scenario breakdown", () => {
    expect(buildVideoProps({ ...validInput, demandBreakdowns: [] }).scenes[0]?.heat).toBeUndefined();
  });

  it("returns graceful failure when no video source is available and render is disabled", async () => {
    await expect(
      runVideoGeneration(validInput, { gracefulFailure: true, disableRender: true })
    ).resolves.toMatchObject({
      success: false,
      video: null
    });
  });

  it("returns video metadata when a video url is provided", async () => {
    await expect(
      runVideoGeneration(validInput, {
        gracefulFailure: true,
        videoUrl: "/uploads/ai-trends/2026-06-30/briefing.mp4",
        posterUrl: "/uploads/ai-trends/2026-06-30/poster.jpg",
        durationSeconds: 52,
        disableRender: true
      })
    ).resolves.toMatchObject({
      success: true,
      video: {
        videoUrl: "/api/uploads/ai-trends/2026-06-30/briefing.mp4",
        videoPosterUrl: "/api/uploads/ai-trends/2026-06-30/poster.jpg",
        videoDurationSeconds: 52
      }
    });
  });

  it("uses the newly rendered poster instead of inheriting an earlier issue's poster", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "ai-trend-poster-test-"));
    try {
      await expect(
        runVideoGeneration({ ...validInput, videoPosterUrl: "/uploads/ai-trends/2026-06-01/old-poster.png" }, { outputDir })
      ).resolves.toMatchObject({
        success: true,
        video: {
          videoUrl: "/api/uploads/ai-trends/2026-06-30/briefing.mp4",
          videoPosterUrl: "/api/uploads/ai-trends/2026-06-30/briefing-poster.png"
        }
      });
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });
});
