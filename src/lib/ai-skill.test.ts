import { describe, expect, it } from "vitest";
import {
  aiSkillPackageMaxBytes,
  isZipFileSignature,
  normalizeSupportedAgents,
  validateAiSkillPackage,
} from "@/lib/ai-skill";

describe("AI Skill helpers", () => {
  it("normalizes supported agent options and removes duplicates", () => {
    expect(
      normalizeSupportedAgents([
        "Codex",
        "openclaw",
        "Claude Code",
        "Codex",
        "unknown-agent",
      ]),
    ).toEqual(["Codex", "OpenClaw", "Claude Code"]);
  });

  it("accepts a ZIP package from common browser MIME types", () => {
    expect(
      validateAiSkillPackage({
        name: "code-review-skill.ZIP",
        type: "application/x-zip-compressed",
        size: 1024,
      }),
    ).toBeNull();
    expect(
      validateAiSkillPackage({
        name: "code-review-skill.zip",
        type: "",
        size: 1024,
      }),
    ).toBeNull();
  });

  it("rejects non-ZIP files, mismatched MIME types, and oversized packages", () => {
    expect(
      validateAiSkillPackage({
        name: "code-review-skill.rar",
        type: "application/vnd.rar",
        size: 1024,
      }),
    ).toContain("ZIP");
    expect(
      validateAiSkillPackage({
        name: "code-review-skill.zip",
        type: "text/plain",
        size: 1024,
      }),
    ).toContain("ZIP");
    expect(
      validateAiSkillPackage({
        name: "code-review-skill.zip",
        type: "application/zip",
        size: aiSkillPackageMaxBytes + 1,
      }),
    ).toContain("100MB");
  });

  it("recognizes standard ZIP file signatures", () => {
    expect(isZipFileSignature(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
    expect(isZipFileSignature(new Uint8Array([0x50, 0x4b, 0x05, 0x06]))).toBe(true);
    expect(isZipFileSignature(new Uint8Array([0x50, 0x4b, 0x07, 0x08]))).toBe(true);
    expect(isZipFileSignature(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).toBe(false);
  });
});
