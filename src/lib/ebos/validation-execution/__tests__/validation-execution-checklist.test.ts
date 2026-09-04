import { describe, expect, test } from "vitest";
import {
  buildCodexExecutionChecklist,
  buildExecutionChecklist,
  buildHumanExecutionChecklist
} from "../validation-execution-checklist";
import type { EbosValidationExecutionPlan } from "../validation-execution-types";

function executionPlan(): EbosValidationExecutionPlan {
  return {
    planId: "plan-1",
    title: "Validate AI Prompt Kit",
    targetDirection: "AI Prompt Kit",
    validationMethod: "landing_page",
    objective: "Validate demand.",
    hypothesis: "Users will click or buy.",
    successMetric: "CTA clicks, leads, or orders.",
    minimumSuccessThreshold: "CTA clicks >= 10 or leads >= 3.",
    durationDays: 7,
    executionStatus: "not_started",
    trackingFields: [],
    codexTasks: ["Draft validation page"],
    humanTasks: ["Share validation page"],
    acceptanceCriteria: ["Page has CTA and tracking note."],
    resultInputTemplate: { planId: "plan-1", status: "not_started" }
  };
}

describe("validation execution checklist", () => {
  test("builds non-empty Codex checklist with acceptance criteria", () => {
    const checklist = buildCodexExecutionChecklist(executionPlan());

    expect(checklist.length).toBeGreaterThan(0);
    expect(checklist.every((item) => item.acceptanceCriteria.length > 0)).toBe(true);
    expect(checklist.map((item) => item.title).join(" ")).toContain("CTA");
  });

  test("builds non-empty human checklist with acceptance criteria", () => {
    const checklist = buildHumanExecutionChecklist(executionPlan());

    expect(checklist.length).toBeGreaterThan(0);
    expect(checklist.every((item) => item.acceptanceCriteria.length > 0)).toBe(true);
    expect(checklist.map((item) => item.title).join(" ")).toContain("记录");
  });

  test("combines Codex and human checklist", () => {
    const checklist = buildExecutionChecklist(executionPlan());

    expect(checklist.codex.length).toBeGreaterThan(0);
    expect(checklist.human.length).toBeGreaterThan(0);
  });
});
