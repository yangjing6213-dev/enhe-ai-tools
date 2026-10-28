import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runAiTrendPublication } from "./publish-ai-trend-briefing-with-video";

const args = ["--date", "2026-10-27", "--summary-file", "summary.json", "--file", "report.html", "--mode", "published"];
const video = { videoUrl: "/api/uploads/ai-trends/2026-10-27/briefing.mp4", videoTitle: "Current briefing", videoDescription: "Current findings", videoPosterUrl: null, videoDurationSeconds: 9 };

describe("AI trend publication with video", () => {
  it("passes the separate HTML artifact into rendering and only attaches this issue's video", async () => {
    const execute = vi.fn().mockResolvedValueOnce({ stdout: JSON.stringify({ success: true, video }) }).mockResolvedValueOnce({ stdout: "Published" });
    const result = await runAiTrendPublication([...args, "--require-production-target"], execute);
    const renderArgs = execute.mock.calls[0][1] as string[];
    expect(renderArgs[renderArgs.indexOf("--file") + 1]).toBe(resolve("report.html"));
    expect(execute.mock.calls[1][1]).toContain(video.videoUrl);
    expect(execute.mock.calls[1][1]).toContain("--require-production-target");
    expect(result).toMatchObject({ status: "complete", date: "2026-10-27" });
  });

  it.each(["process-failure", "structured-failure", "older-video"])("publishes HTML without old video metadata after %s", async (failure) => {
    const execute = vi.fn();
    if (failure === "process-failure") execute.mockRejectedValueOnce(new Error("Renderer failed"));
    else execute.mockResolvedValueOnce({ stdout: JSON.stringify(failure === "structured-failure" ? { success: false, video: null } : { success: true, video: { ...video, videoUrl: "/uploads/ai-trends/2026-08-31/briefing.mp4" } }) });
    execute.mockResolvedValueOnce({ stdout: "Published HTML" });
    await expect(runAiTrendPublication(args, execute)).resolves.toMatchObject({ status: "partial", video: null });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[1][1]).toContain("--clear-video");
    expect(execute.mock.calls[1][1]).not.toContain("--video-url");
  });

  it("does not report partial publication if the HTML publisher itself fails", async () => {
    const execute = vi.fn().mockRejectedValueOnce(new Error("Renderer failed")).mockRejectedValueOnce(new Error("Publisher failed"));
    await expect(runAiTrendPublication(args, execute)).rejects.toThrow("Publisher failed");
  });

  it("publishes HTML without video metadata when the poster belongs to an earlier issue", async () => {
    const oldPoster = "/api/uploads/ai-trends/2026-08-31/briefing-poster.png";
    const execute = vi.fn().mockResolvedValueOnce({ stdout: JSON.stringify({ success: true, video: { ...video, videoPosterUrl: oldPoster } }) }).mockResolvedValueOnce({ stdout: "Published" });
    const result = await runAiTrendPublication(args, execute);

    expect(result).toMatchObject({ status: "partial", video: null });
    expect(execute.mock.calls[1][1]).toContain("--clear-video");
    expect(execute.mock.calls[1][1]).not.toContain("--video-url");
    expect(execute.mock.calls[1][1]).not.toContain("--video-poster-url");
    expect(execute.mock.calls[1][1]).not.toContain(oldPoster);
  });

  it("keeps the poster from the current issue", async () => {
    const poster = "/api/uploads/ai-trends/2026-10-27/briefing-poster.png";
    const execute = vi.fn().mockResolvedValueOnce({ stdout: JSON.stringify({ success: true, video: { ...video, videoPosterUrl: poster } }) }).mockResolvedValueOnce({ stdout: "Published" });
    const result = await runAiTrendPublication(args, execute);

    expect(result.video?.videoPosterUrl).toBe(poster);
    expect(execute.mock.calls[1][1]).toContain(poster);
  });
});
