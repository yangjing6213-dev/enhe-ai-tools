import { describe, expect, it } from "vitest";
import { buildAiWorkflowInstallInstruction, resolveAiWorkflowRuntime } from "@/lib/ai-workflows/install";

describe("AI Workflow installation instructions", () => {
  const input = {
    agent: "codex" as const,
    runtime: "windows" as const,
    repositoryUrl: "https://github.com/example/workflow",
    commitSha: "a".repeat(40),
    packageVersion: "a".repeat(40),
    packageSha256: "b".repeat(64),
    downloadUrl: "https://enhe-downloads-1303691623.cos.ap-shanghai.myqcloud.com/ai-workflows/archive.zip?sign=temporary",
    locale: "zh" as const,
  };

  it("includes the fixed source, temporary download link, and checksum without claiming execution", () => {
    const instruction = buildAiWorkflowInstallInstruction(input);
    expect(instruction).toContain(input.repositoryUrl);
    expect(instruction).toContain(input.commitSha);
    expect(instruction).toContain(input.packageSha256);
    expect(instruction).toContain(input.downloadUrl);
    expect(instruction).toContain("尚未安装");
  });

  it("rejects malformed versions and non-approved download hosts", () => {
    expect(() => buildAiWorkflowInstallInstruction({ ...input, packageVersion: "bad\nversion" })).toThrow();
    expect(() => buildAiWorkflowInstallInstruction({ ...input, downloadUrl: "https://example.com/file.zip" })).toThrow();
  });

  it("recognizes only named verified runtimes", () => {
    expect(resolveAiWorkflowRuntime("Windows 11" )).toBe("windows");
    expect(resolveAiWorkflowRuntime("Ubuntu on WSL2")).toBe("wsl2");
    expect(resolveAiWorkflowRuntime("Unknown environment")).toBeNull();
  });
});
