import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import {
  calculateLaunchReadinessScore,
  checkExternalIntakeFiles,
  checkTrackingEvents,
  checkValidationAssets,
  checkValidationLaunchReadiness,
  checkValidationPageFile
} from "../validation-launch-readiness";

async function makeRoot() {
  return mkdtemp(join(tmpdir(), "ebos-launch-readiness-"));
}

async function writePage(filePath: string, options: { cta?: boolean } = {}) {
  await mkdir(filePath.replace(/\\[^\\]+$/, ""), { recursive: true });
  await writeFile(filePath, [
    "export async function generateMetadata() { return {}; }",
    "export default function Page() {",
    "return <main>",
    "<section>Hero</section>",
    "<section>Summary</section>",
    options.cta === false ? "" : "<a data-analytics-event=\"validation_ai_prompt_kit_cta_click\">CTA</a>",
    "<section>FAQ</section>",
    "<section>Compliance note</section>",
    "</main>;",
    "}"
  ].join("\n"), "utf8");
}

describe("validation launch readiness", () => {
  test("blocks when validation page file is missing", async () => {
    const report = await checkValidationLaunchReadiness({
      targetDate: "2026-07-03",
      projectRoot: await makeRoot()
    });

    expect(report.readinessStatus).toBe("blocked");
    expect(report.blockers.join("\n")).toContain("validation page");
  });

  test("marks page missing CTA as needs_fixes", async () => {
    const root = await makeRoot();
    const pagePath = join(root, "page.tsx");
    await writePage(pagePath, { cta: false });

    const check = await checkValidationPageFile(pagePath, "/validation/ai-prompt-kit");

    expect(check.exists).toBe(true);
    expect(check.hasCTA).toBe(false);
    expect(check.warnings.join("\n")).toContain("CTA");
  });

  test("passes asset checks when all required files exist", async () => {
    const root = await makeRoot();
    const assetsDir = join(root, "docs", "ebos", "validation-assets");
    await mkdir(assetsDir, { recursive: true });
    for (const fileName of [
      "2026-07-03-ai-prompt-kit-landing-copy.md",
      "2026-07-03-ai-prompt-kit-marketplace-listings.md",
      "2026-07-03-ai-prompt-kit-minimum-product.md",
      "2026-07-03-ai-video-studio-validation-copy.md",
      "2026-07-03-codex-operator-summary.md",
      "2026-07-03-faceswap-validation-copy.md",
      "2026-07-03-social-promotion-copy.md",
      "2026-07-03-three-day-validation-checklist.md",
      "2026-07-03-validation-input-fill-guide.md"
    ]) {
      await writeFile(join(assetsDir, fileName), "asset", "utf8");
    }

    const checks = await checkValidationAssets(assetsDir);

    expect(checks).toHaveLength(9);
    expect(checks.every((check) => check.exists && check.readyForUse)).toBe(true);
  });

  test("passes tracking checks when analytics whitelist contains validation events", async () => {
    const root = await makeRoot();
    const analyticsPath = join(root, "src", "lib", "analytics.ts");
    await mkdir(join(root, "src", "lib"), { recursive: true });
    await writeFile(analyticsPath, [
      "validation_ai_prompt_kit_cta_click",
      "validation_faceswap_cta_click",
      "validation_ai_video_cta_click"
    ].join("\n"), "utf8");

    const checks = await checkTrackingEvents({ projectRoot: root });

    expect(checks.every((check) => check.found)).toBe(true);
  });

  test("does not block when external intake exists but is unfilled", async () => {
    const root = await makeRoot();
    const intakeRoot = join(root, "reports", "ebos", "validation", "intake");
    await mkdir(join(intakeRoot, "templates"), { recursive: true });
    await mkdir(join(intakeRoot, "inputs"), { recursive: true });
    await mkdir(join(intakeRoot, "imports"), { recursive: true });
    await writeFile(join(intakeRoot, "templates", "2026-07-03-external-intake-template.md"), "template", "utf8");
    await writeFile(join(intakeRoot, "inputs", "2026-07-03-external-intake-input.json"), "{}", "utf8");
    await writeFile(join(intakeRoot, "imports", "2026-07-03-external-intake-import-report.md"), "Imported 0", "utf8");

    const checks = await checkExternalIntakeFiles({ projectRoot: root, targetDate: "2026-07-03" });

    expect(checks.some((check) => check.key === "external_intake_input" && check.exists)).toBe(true);
    expect(checks.flatMap((check) => check.warnings).join("\n")).toContain("not filled");
  });

  test("calculates readiness score from check groups", () => {
    const score = calculateLaunchReadinessScore({
      validationPages: [{ exists: true, hasHero: true, hasSummary: true, hasCTA: true, hasFAQ: true, hasComplianceNotice: true, hasTrackingEvent: true, hasSeoMetadata: true, warnings: [], path: "/", filePath: "page.tsx" }],
      assetFiles: [{ filePath: "a.md", exists: true, purpose: "asset", readyForUse: true, warnings: [] }],
      trackingChecks: [{ eventName: "validation_ai_prompt_kit_cta_click", expectedLocation: "analytics whitelist", found: true, sourceFile: "analytics.ts", warnings: [] }],
      seoGeoChecks: [{ key: "metadata", label: "Metadata", passed: true, warnings: [] }],
      externalIntakeChecks: [{ key: "external_intake_input", filePath: "input.json", exists: true, readyForUse: false, warnings: ["not filled"] }],
      deploymentChecks: [{ key: "build_script", label: "Build script", passed: true, warnings: [] }]
    });

    expect(score).toBeGreaterThanOrEqual(85);
    expect(score).toBeLessThanOrEqual(100);
  });
});
