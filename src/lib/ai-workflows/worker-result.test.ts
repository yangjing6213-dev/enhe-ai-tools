import { describe, expect, it } from "vitest";
import {
  buildAiWorkflowProductContent,
  parseAiWorkflowWorkerResult,
} from "@/lib/ai-workflows/worker-result";

const sha256 = "b".repeat(64);
const commit = "a".repeat(40);
const repositoryId = "123456";

function result(overrides: Record<string, unknown> = {}) {
  return {
    repositoryId,
    repositoryUrl: "https://github.com/example/agent-flow",
    commitSha: commit,
    licenseSpdx: "MIT",
    licenseFilePath: "LICENSE",
    licenseFileSha256: sha256,
    licenseReviewSummary: "The included MIT license permits redistribution with its notice retained.",
    projectType: "workflow",
    stars: 125,
    verifiedEnvironments: ["windows"],
    validation: {
      command: "npm test",
      exitCode: 0,
      summary: "A synthetic workflow completed and produced the expected output.",
      recordedAt: "2026-10-20T01:00:00.000Z",
    },
    archive: {
      sha256,
      size: 1024,
      crc64: "1234567890123",
      remoteSize: 1024,
      remoteCrc64: "1234567890123",
      anonymousReadDenied: true,
      bucket: "enhe-downloads-1303691623",
      region: "ap-shanghai",
      objectKey: `ai-workflows/${repositoryId}/${commit}/${sha256}.zip`,
      filePath: `cos://enhe-downloads-1303691623/ai-workflows/${repositoryId}/${commit}/${sha256}.zip`,
      fileName: "agent-flow.zip",
      contentType: "application/zip",
    },
    product: {
      name: "AI 工作流示例",
      englishName: "Agent Flow",
      shortDescription: "面向重复研究任务的可复用工作流。",
      valueStatement: "把重复研究步骤整理成可复用的流程。",
      audience: "需要整理公开资料的研究人员。",
      painPoints: "手动检索与汇总步骤重复。",
      capabilities: "读取输入、整理证据并输出结构化摘要。",
      limitations: "需要用户自行配置模型服务。",
      exampleInput: "请汇总三份公开产品说明中的功能差异。",
      exampleSteps: ["读取资料", "按主题比对", "生成带来源的结果"],
      exampleOutput: "一份列出差异和来源的结构化摘要。",
      dependencies: "Node.js 20；需要用户自己的模型账号。",
      installGuide: "解压后按 README 的步骤安装依赖并运行示例。",
      recoveryGuide: "停止进程后删除独立安装目录即可卸载。",
      additionalCosts: "模型服务费用由用户按其供应商账单承担。",
      modificationSummary: "仅增加中文说明和验证记录。",
      priceSuggestionCents: 1900,
      priceRationale: {
        targetUser: "需要可复用研究流程的个人和小团队。",
        problemSolved: "减少重复整理公开资料的手工步骤。",
        deliveryScope: "固定版本源码、中文说明和验证记录。",
        validationEffort: "完成一次合成输入核心流程检查。",
        usageBarrier: "需要 Node.js 和自行配置模型服务。",
        externalCosts: "可能产生第三方模型费用。",
        reason: "价格参考整理和验证范围，仍由管理员逐项确认。",
      },
    },
    ...overrides,
  };
}

describe("AI Workflow worker result intake", () => {
  it("accepts a fixed, checksummed package only when the redistributable license and remote checks match", () => {
    const parsed = parseAiWorkflowWorkerResult(result());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.objectKey).toBe("ai-workflows/" + repositoryId + "/" + commit + "/" + sha256 + ".zip");
      expect(parsed.data.verifiedEnvironments).toEqual(["windows"]);
      expect(parsed.data.packageVersion).toBe(commit);
      expect(parsed.data.priceRationale).toMatchObject({
        targetUsers: "需要可复用研究流程的个人和小团队。",
        problem: "减少重复整理公开资料的手工步骤。",
      });
    }
  });

  it("rejects unknown licenses, mismatched remote checks, and incomplete core validation", () => {
    expect(parseAiWorkflowWorkerResult(result({ licenseSpdx: null })).success).toBe(false);
    expect(parseAiWorkflowWorkerResult(result({
      archive: { ...result().archive, remoteSize: 1023 },
    })).success).toBe(false);
    expect(parseAiWorkflowWorkerResult(result({
      validation: { ...result().validation, exitCode: 1 },
    })).success).toBe(false);
    expect(parseAiWorkflowWorkerResult(result({ licenseSpdx: "GPL-3.0-only" })).success).toBe(false);
    expect(parseAiWorkflowWorkerResult(result({
      archive: { ...result().archive, anonymousReadDenied: false },
    })).success).toBe(false);
  });

  it("builds complete product sections from the reviewed evidence", () => {
    const parsed = parseAiWorkflowWorkerResult(result());
    if (!parsed.success) throw new Error("The fixture should satisfy the worker result contract.");
    const content = buildAiWorkflowProductContent(parsed.data.product);
    expect(content).toContain("适用边界");
    expect(content).toContain("使用示例");
    expect(content).toContain("依赖与额外成本");
    expect(content).toContain("停止进程后删除独立安装目录即可卸载。");
  });
});
