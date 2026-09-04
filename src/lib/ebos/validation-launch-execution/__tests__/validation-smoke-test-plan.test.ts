import { describe, expect, test } from "vitest";
import {
  buildLocalSmokeTestCommands,
  buildProductionSmokeTestCommands,
  buildValidationSmokeTestPlan
} from "../validation-smoke-test-plan";

describe("validation smoke test plan", () => {
  test("includes local routes and production routes", () => {
    const plan = buildValidationSmokeTestPlan({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn"
    });
    const urls = plan.map((item) => item.url);

    expect(urls).toContain("http://localhost:3000/validation/ai-prompt-kit");
    expect(urls).toContain("http://localhost:3000/en/validation/ai-prompt-kit");
    expect(urls).toContain("https://www.enhe-tech.com.cn/validation/ai-prompt-kit");
    expect(urls).toContain("https://www.enhe-tech.com.cn/en/validation/ai-prompt-kit");
  });

  test("includes status, content, CTA, FAQ, metadata, and tracking checks", () => {
    const checkTypes = buildValidationSmokeTestPlan({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn"
    }).map((item) => item.checkType);

    expect(checkTypes).toEqual(expect.arrayContaining([
      "http_status",
      "page_content",
      "cta_present",
      "metadata",
      "tracking_plan"
    ]));
  });

  test("local smoke commands include build and validation routes", () => {
    const commands = buildLocalSmokeTestCommands().join("\n");

    expect(commands).toContain("npm run build");
    expect(commands).toContain("/validation/ai-prompt-kit");
    expect(commands).toContain("/en/validation/ai-prompt-kit");
  });

  test("production smoke commands list public URLs without requiring network execution", () => {
    const commands = buildProductionSmokeTestCommands("https://www.enhe-tech.com.cn").join("\n");

    expect(commands).toContain("https://www.enhe-tech.com.cn/validation/ai-prompt-kit");
    expect(commands).toContain("https://www.enhe-tech.com.cn/en/validation/ai-prompt-kit");
    expect(commands).toContain("--dry-run");
  });
});
