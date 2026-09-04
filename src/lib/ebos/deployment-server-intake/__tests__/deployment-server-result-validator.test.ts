import { describe, expect, test } from "vitest";
import {
  canTransitionToDeployedPendingVerification,
  validateServerDeploymentResultInput
} from "../deployment-server-result-validator";
import type { EbosServerDeploymentResultInput } from "../deployment-server-intake-types";

function input(overrides: Partial<EbosServerDeploymentResultInput> = {}): EbosServerDeploymentResultInput {
  return {
    inputType: "server_deployment_result_input",
    targetDate: "2026-07-03",
    serverCommandsCompleted: false,
    dockerCommandsCompleted: false,
    nginxCommandsCompleted: false,
    deployedAt: null,
    commandSummaries: [],
    failures: [],
    evidence: [],
    notes: "",
    ...overrides
  };
}

describe("server deployment result validator", () => {
  test("allows transition only when all completion flags are true and deployedAt exists", () => {
    const validation = validateServerDeploymentResultInput(input({
      serverCommandsCompleted: true,
      dockerCommandsCompleted: true,
      nginxCommandsCompleted: true,
      deployedAt: "2026-07-05T01:00:00.000Z",
      evidence: ["non-secret output summary"]
    }));

    expect(validation.valid).toBe(true);
    expect(validation.canTransitionToDeployedPendingVerification).toBe(true);
    expect(canTransitionToDeployedPendingVerification(input({
      serverCommandsCompleted: true,
      dockerCommandsCompleted: true,
      nginxCommandsCompleted: true,
      deployedAt: "2026-07-05T01:00:00.000Z"
    }))).toBe(true);
  });

  test("keeps valid input non-transitionable when a completed flag is false", () => {
    const validation = validateServerDeploymentResultInput(input({
      serverCommandsCompleted: true,
      dockerCommandsCompleted: false,
      nginxCommandsCompleted: true,
      deployedAt: "2026-07-05T01:00:00.000Z"
    }));

    expect(validation.valid).toBe(true);
    expect(validation.canTransitionToDeployedPendingVerification).toBe(false);
    expect(validation.blockers).toContain("dockerCommandsCompleted is false.");
  });

  test("blocks transition when failures are present", () => {
    const validation = validateServerDeploymentResultInput(input({
      serverCommandsCompleted: true,
      dockerCommandsCompleted: true,
      nginxCommandsCompleted: true,
      deployedAt: "2026-07-05T01:00:00.000Z",
      failures: ["nginx reload failed once"]
    }));

    expect(validation.canTransitionToDeployedPendingVerification).toBe(false);
    expect(validation.blockers).toContain("failures must be empty before transition.");
  });

  test("warns when evidence is empty without blocking a complete result", () => {
    const validation = validateServerDeploymentResultInput(input({
      serverCommandsCompleted: true,
      dockerCommandsCompleted: true,
      nginxCommandsCompleted: true,
      deployedAt: "2026-07-05T01:00:00.000Z"
    }));

    expect(validation.valid).toBe(true);
    expect(validation.canTransitionToDeployedPendingVerification).toBe(true);
    expect(validation.warnings).toContain("evidence is empty; prefer non-secret server output summaries.");
  });
});
