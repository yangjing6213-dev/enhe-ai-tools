import { describe, expect, test } from "vitest";
import {
  createCommandHealthResult,
  normalizeCommandResult,
  summarizeCommandHealthResults
} from "../command-health";

describe("command health", () => {
  test("normalizes passed, failed, skipped, and unknown command states", () => {
    expect(normalizeCommandResult({ exitCode: 0 })).toBe("passed");
    expect(normalizeCommandResult({ exitCode: 1 })).toBe("failed");
    expect(normalizeCommandResult({ skipped: true })).toBe("skipped");
    expect(normalizeCommandResult({ exitCode: null })).toBe("unknown");
  });

  test("creates a failure result with a readable summary", () => {
    const result = createCommandHealthResult({
      key: "build",
      command: "npm run build",
      exitCode: 1,
      stderr: "Build failed",
      durationMs: 1234
    });

    expect(result.status).toBe("failed");
    expect(result.summary).toContain("npm run build");
    expect(result.summary).toContain("Build failed");
    expect(result.durationMs).toBe(1234);
  });

  test("summarizes failed checks without running shell commands", () => {
    const summary = summarizeCommandHealthResults([
      createCommandHealthResult({
        key: "lint",
        command: "npm run lint",
        exitCode: 0
      }),
      createCommandHealthResult({
        key: "typecheck",
        command: "npm run typecheck",
        exitCode: 2,
        stderr: "Type error"
      })
    ]);

    expect(summary.total).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.failureSummary[0]).toContain("typecheck");
  });
});
