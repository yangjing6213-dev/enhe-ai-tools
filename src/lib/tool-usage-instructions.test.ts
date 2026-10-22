import { describe, expect, it } from "vitest";
import {
  composeToolChangelogVersion,
  normalizeToolUsageSteps,
  parseToolChangelogVersion,
  parseToolUsageStepsJson,
} from "./tool-usage-instructions";

describe("tool usage instructions", () => {
  it("accepts one through five complete ordered steps", () => {
    const steps = Array.from({ length: 5 }, (_, index) => ({
      title: `Step ${index + 1}`,
      description: `Description ${index + 1}`,
    }));

    expect(parseToolUsageStepsJson(JSON.stringify(steps))).toEqual(steps);
    expect(parseToolUsageStepsJson(JSON.stringify(steps.slice(0, 1)))).toHaveLength(1);
  });

  it("rejects empty, incomplete, malformed, or more than five steps", () => {
    expect(() => parseToolUsageStepsJson("[]")).toThrow();
    expect(() => parseToolUsageStepsJson("not-json")).toThrow();
    expect(() => parseToolUsageStepsJson(JSON.stringify([
      { title: "", description: "Missing title" },
    ]))).toThrow();
    const sixSteps = Array.from({ length: 6 }, (_, index) => ({
      title: `Step ${index + 1}`,
      description: "Description",
    }));
    expect(() => parseToolUsageStepsJson(JSON.stringify(sixSteps))).toThrow();
    expect(() => parseToolUsageStepsJson(JSON.stringify([{ title: "x".repeat(121), description: "Valid" }]))).toThrow();
  });

  it("normalizes stored steps for display without trusting malformed JSON", () => {
    expect(normalizeToolUsageSteps([
      { title: " First ", description: " Body " },
      { title: "", description: "ignored" },
    ])).toEqual([{ title: "First", description: "Body" }]);
    expect(normalizeToolUsageSteps({ unexpected: true })).toEqual([]);
  });
});

describe("tool changelog versions", () => {
  it("composes canonical V major.minor values from bounded dropdowns", () => {
    expect(composeToolChangelogVersion("1", "0")).toBe("V1.0");
    expect(composeToolChangelogVersion("12", "7")).toBe("V12.7");
  });

  it("rejects manual or out-of-range version values", () => {
    expect(() => composeToolChangelogVersion("1.0", "0")).toThrow();
    expect(() => composeToolChangelogVersion("100", "0")).toThrow();
    expect(() => composeToolChangelogVersion("1", "100")).toThrow();
  });

  it("reads standard and legacy lowercase version labels for editing", () => {
    expect(parseToolChangelogVersion("V1.2")).toEqual({ major: 1, minor: 2 });
    expect(parseToolChangelogVersion("v0.1")).toEqual({ major: 0, minor: 1 });
    expect(parseToolChangelogVersion("unstable")).toBeNull();
  });
});
