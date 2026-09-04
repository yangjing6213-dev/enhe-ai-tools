import { describe, expect, test } from "vitest";
import {
  buildBuildAndQualityChecks,
  buildRouteChecks,
  buildRollbackChecklist,
  buildSeoTrackingChecks,
  buildValidationDataChecks,
  buildValidationDeploymentChecklist
} from "../validation-deployment-checklist";
import type { EbosValidationLaunchReadinessReport } from "../../validation-launch";

function readiness(overrides: Partial<EbosValidationLaunchReadinessReport> = {}): EbosValidationLaunchReadinessReport {
  return {
    reportType: "validation_launch_readiness",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-04T00:00:00.000Z",
    validationPages: [],
    assetFiles: [],
    trackingChecks: [],
    seoGeoChecks: [],
    externalIntakeChecks: [],
    deploymentChecks: [],
    readinessScore: 98,
    readinessStatus: "ready_with_warnings",
    blockers: [],
    warnings: ["External intake input exists but is not filled with real channel data."],
    nextActions: [],
    ...overrides
  };
}

describe("validation deployment checklist", () => {
  test("includes lint, typecheck, and build checks", () => {
    const commands = buildBuildAndQualityChecks().map((item) => item.command).join("\n");

    expect(commands).toContain("npm run lint");
    expect(commands).toContain("npm run typecheck");
    expect(commands).toContain("npm run build");
  });

  test("includes validation routes", () => {
    const text = buildRouteChecks().map((item) => item.evidence).join("\n");

    expect(text).toContain("/validation/ai-prompt-kit");
    expect(text).toContain("/en/validation/ai-prompt-kit");
  });

  test("includes SEO and tracking checks", () => {
    const text = buildSeoTrackingChecks().map((item) => `${item.id} ${item.title} ${item.evidence}`).join("\n");

    expect(text).toContain("metadata");
    expect(text).toContain("title");
    expect(text).toContain("description");
    expect(text).toContain("FAQ");
    expect(text).toContain("summary");
    expect(text).toContain("validation_ai_prompt_kit_cta_click");
    expect(text).toContain("validation_faceswap_cta_click");
    expect(text).toContain("validation_ai_video_cta_click");
  });

  test("includes validation input, external intake, capture, and readiness checks", () => {
    const text = buildValidationDataChecks({
      targetDate: "2026-07-03",
      readinessReport: readiness()
    }).map((item) => `${item.title} ${item.evidence} ${item.status}`).join("\n");

    expect(text).toContain("validation-input.json");
    expect(text).toContain("external-intake-input.json");
    expect(text).toContain("capture report");
    expect(text).toContain("ready_with_warnings");
  });

  test("includes rollback checklist without executing rollback", () => {
    const text = buildRollbackChecklist().map((item) => `${item.title} ${item.evidence}`).join("\n");

    expect(text).toContain("validation route");
    expect(text).toContain("tracking event whitelist");
    expect(text).toContain("reports");
  });

  test("builds a complete deployment checklist", () => {
    const checklist = buildValidationDeploymentChecklist({
      targetDate: "2026-07-03",
      readinessReport: readiness()
    });

    expect(checklist.length).toBeGreaterThan(12);
    expect(checklist.some((item) => item.category === "rollback")).toBe(true);
    expect(checklist.some((item) => item.status === "manual_required")).toBe(true);
  });
});
