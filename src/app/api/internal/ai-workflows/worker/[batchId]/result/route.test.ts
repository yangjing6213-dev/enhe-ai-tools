import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashAiWorkflowLeaseToken } from "@/lib/ai-workflows/worker";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  settingsFindUnique: vi.fn(),
  batchesFindUnique: vi.fn(),
  candidatesFindUnique: vi.fn(),
  candidatesUpdate: vi.fn(),
  toolsCreate: vi.fn(),
  filesCreate: vi.fn(),
  toolsUpdate: vi.fn(),
  candidatesCreate: vi.fn(),
  batchesUpdateMany: vi.fn(),
  transaction: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));

vi.mock("@/lib/db", () => ({
  prisma: {
    aiWorkflowCollectionSetting: { findUnique: mocks.settingsFindUnique },
    aiWorkflowBatch: { findUnique: mocks.batchesFindUnique },
    $transaction: mocks.transaction,
  },
}));

const workerToken = "workflow-worker-token-1234567890";
const leaseToken = "batch-lease-token-1234567890";
const commit = "a".repeat(40);
const sha256 = "b".repeat(64);
const presentation = {
  zh: { name: "研究工作流", shortDescription: "整理公开研究资料。", content: "项目说明\n整理资料并保留来源。" },
  en: { name: "Research workflow", shortDescription: "Organize public research.", content: "Project overview\nOrganize research and retain its sources." },
  cover: { url: `https://raw.githubusercontent.com/example/agent-flow/${commit}/banner.png`, source: "repository", sourceUrl: `https://github.com/example/agent-flow/blob/${commit}/README.md` },
};

function candidateResult(overrides: Record<string, unknown> = {}) {
  return {
    repositoryId: "123456",
    repositoryUrl: "https://github.com/example/agent-flow",
    commitSha: commit,
    licenseSpdx: "MIT",
    licenseFilePath: "LICENSE",
    licenseFileSha256: sha256,
    licenseReviewSummary: "The included MIT license permits redistribution with its notice retained.",
    projectType: "workflow",
    stars: 125,
    verifiedEnvironments: ["windows"],
    validation: { command: "npm test", exitCode: 0, summary: "Passed with synthetic inputs.", recordedAt: "2026-10-19T17:30:00.000Z" },
    archive: {
      sha256,
      size: 1024,
      crc64: "1234567890123",
      remoteSize: 1024,
      remoteCrc64: "1234567890123",
      anonymousReadDenied: true,
      bucket: "enhe-downloads-1303691623",
      region: "ap-shanghai",
      objectKey: `ai-workflows/123456/${commit}/${sha256}.zip`,
      filePath: `cos://enhe-downloads-1303691623/ai-workflows/123456/${commit}/${sha256}.zip`,
      fileName: "agent-flow.zip",
      contentType: "application/zip",
    },
    product: {
      name: "AI 工作流示例", englishName: "Agent Flow", shortDescription: "面向重复研究任务的可复用工作流。",
      valueStatement: "把重复研究步骤整理成可复用的流程。", audience: "需要整理公开资料的研究人员。",
      painPoints: "手动检索与汇总步骤重复。", capabilities: "读取输入、整理证据并输出结构化摘要。",
      limitations: "需要用户自行配置模型服务。", exampleInput: "请汇总三份公开产品说明中的功能差异。",
      exampleSteps: ["读取资料", "按主题比对", "生成带来源的结果"], exampleOutput: "一份列出差异和来源的结构化摘要。",
      dependencies: "Node.js 20；需要用户自己的模型账号。", installGuide: "解压后按 README 的步骤安装依赖并运行示例。",
      recoveryGuide: "停止进程后删除独立安装目录即可卸载。", additionalCosts: "模型服务费用由用户按其供应商账单承担。",
      modificationSummary: "仅增加中文说明和验证记录。", priceSuggestionCents: 1900,
      priceRationale: {
        targetUser: "需要可复用研究流程的个人和小团队。", problemSolved: "减少重复整理公开资料的手工步骤。",
        deliveryScope: "固定版本源码、中文说明和验证记录。", validationEffort: "完成一次合成输入核心流程检查。",
        usageBarrier: "需要 Node.js 和自行配置模型服务。", externalCosts: "可能产生第三方模型费用。",
        reason: "价格参考整理和验证范围，仍由管理员逐项确认。",
      },
    },
    ...overrides,
  };
}

function repositoryLinkResult(overrides: Record<string, unknown> = {}) {
  return {
    deliveryMode: "repository_link",
    repositoryId: "123456",
    repositoryUrl: "https://github.com/example/agent-flow",
    commitSha: commit,
    licenseSpdx: "MIT",
    licenseFilePath: "LICENSE",
    projectType: "workflow",
    stars: 125,
    updatedAt: "2026-10-20T01:00:00.000Z",
    language: "Python",
    description: "Reusable AI agent workflow for research tasks.",
    failureReason: "PACKAGE_LANGUAGE_UNSUPPORTED",
    ...overrides,
  };
}

function request(body: unknown, authorization = "Bearer " + workerToken) {
  return new Request("https://www.enhe-tech.com.cn/api/internal/ai-workflows/worker/batch-1/result", {
    method: "POST",
    headers: { authorization, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ batchId: "batch-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AI_WORKFLOW_WORKER_TOKEN", workerToken);
  vi.stubEnv("COS_SECRET_ID", "test-secret-id");
  vi.stubEnv("COS_SECRET_KEY", "test-secret-key");
  vi.stubEnv("COS_DOWNLOAD_BUCKET", "enhe-downloads-1303691623");
  vi.stubEnv("COS_REGION", "ap-shanghai");
  mocks.settingsFindUnique.mockResolvedValue({ isPaused: false });
  mocks.batchesFindUnique.mockResolvedValue({
    status: "running", topicId: "topic-1", topicNameSnapshot: "Workflow automation",
    leaseOwnerId: "runner-1", leaseTokenHash: hashAiWorkflowLeaseToken(leaseToken),
    leaseExpiresAt: new Date(Date.now() + 60_000),
  });
  mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
    aiWorkflowCollectionSetting: { findUnique: mocks.settingsFindUnique },
    aiWorkflowBatch: { findUnique: mocks.batchesFindUnique, updateMany: mocks.batchesUpdateMany },
    aiWorkflowCandidate: { findUnique: mocks.candidatesFindUnique, create: mocks.candidatesCreate, update: mocks.candidatesUpdate },
    tool: { create: mocks.toolsCreate, update: mocks.toolsUpdate },
    file: { create: mocks.filesCreate },
  }));
  mocks.candidatesFindUnique.mockResolvedValue(null);
  mocks.candidatesUpdate.mockResolvedValue({ id: "candidate-1" });
  mocks.toolsCreate.mockResolvedValue({ id: "tool-1" });
  mocks.filesCreate.mockResolvedValue({ id: "file-1" });
  mocks.toolsUpdate.mockResolvedValue({ id: "tool-1" });
  mocks.candidatesCreate.mockResolvedValue({ id: "candidate-1" });
  mocks.batchesUpdateMany.mockResolvedValue({ count: 1 });
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/internal/ai-workflows/worker/[batchId]/result", () => {
  it("rejects invalid worker credentials and missing server COS configuration", async () => {
    expect((await POST(request({}), { ...context, params: Promise.resolve({ batchId: "batch-1" }) })).status).toBe(400);
    expect((await POST(request({}, "Bearer invalid-worker-token-1234567890"), context)).status).toBe(401);
    vi.stubEnv("COS_SECRET_KEY", "");
    expect((await POST(request({ workerId: "runner-1", leaseToken, result: candidateResult() }), context)).status).toBe(503);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects results without the active lease or while collection is paused", async () => {
    mocks.batchesFindUnique.mockResolvedValue({ status: "running", leaseOwnerId: "someone-else", leaseTokenHash: "x", leaseExpiresAt: new Date(Date.now() + 60_000) });
    const invalidLease = await POST(request({ workerId: "runner-1", leaseToken, result: candidateResult() }), context);
    expect(invalidLease.status).toBe(409);

    mocks.batchesFindUnique.mockResolvedValue({
      status: "running", topicId: "topic-1", topicNameSnapshot: "Workflow automation", leaseOwnerId: "runner-1",
      leaseTokenHash: hashAiWorkflowLeaseToken(leaseToken), leaseExpiresAt: new Date(Date.now() + 60_000),
    });
    mocks.settingsFindUnique.mockResolvedValue({ isPaused: true });
    const paused = await POST(request({ workerId: "runner-1", leaseToken, result: candidateResult() }), context);
    expect(paused.status).toBe(409);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("creates a private-file draft and links it only after all evidence matches", async () => {
    const response = await POST(request({ workerId: "runner-1", leaseToken, result: candidateResult() }), context);

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ ok: true, candidateId: "candidate-1", state: "pending_pricing" });
    expect(mocks.toolsCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "draft", type: "ai_workflow", downloadPrice: 0, coverImage: "/api/ai-workflows/covers/ai-workflow-123456-agent-flow" }) }));
    expect(mocks.filesCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ storageBucket: "enhe-downloads-1303691623", objectKey: `ai-workflows/123456/${commit}/${sha256}.zip` }) }));
    expect(mocks.toolsUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { downloadFileId: "file-1" } }));
    expect(mocks.candidatesCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "pending_pricing", priceSuggestion: 19 }) }));
    expect(mocks.batchesUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lastWorkerStage: "register" }) }));
  });

  it("publishes a factual repository-link listing without requiring COS or a package", async () => {
    vi.stubEnv("COS_SECRET_KEY", "");
    const response = await POST(request({ workerId: "runner-1", leaseToken, result: repositoryLinkResult() }), context);

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ ok: true, candidateId: "candidate-1", state: "published", deliveryMode: "repository_link" });
    expect(mocks.toolsCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "published",
        onlineUrl: "https://github.com/example/agent-flow",
        isDownloadPaid: false,
        downloadPrice: 0,
      }),
    }));
    expect(mocks.filesCreate).not.toHaveBeenCalled();
    expect(mocks.candidatesCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "published", failureReason: "PACKAGE_LANGUAGE_UNSUPPORTED" }),
    }));
    expect(mocks.candidatesCreate.mock.calls[0]?.[0].data).not.toHaveProperty("fileId");
    expect(mocks.toolsCreate.mock.calls[0]?.[0].data.content).toContain("获取方式和核验状态");
    const publication = mocks.candidatesCreate.mock.calls[0]?.[0].data.validationReport.publication;
    expect(publication).toMatchObject({ mode: "repository_link", enheDownloadPackageAvailable: false });
    expect(publication).not.toHaveProperty("sourceCodeExecuted");
    expect(mocks.toolsCreate.mock.calls[0]?.[0].data.coverImage).toBe("/api/ai-workflows/covers/ai-workflow-123456-agent-flow");
    expect(mocks.revalidateTag).toHaveBeenCalledWith("public-tools");
  });

  it.each(["repository_link", "package"])("persists bilingual fields and image evidence for %s results", async (mode) => {
    const result = mode === "package" ? candidateResult({ presentation }) : repositoryLinkResult({ presentation });
    const response = await POST(request({ workerId: "runner-1", leaseToken, result }), context);

    expect(response.status).toBe(201);
    expect(mocks.toolsCreate.mock.calls[0]?.[0].data).toMatchObject({
      name: presentation.zh.name,
      englishName: presentation.en.name,
      shortDescription: `[[zh]]${presentation.zh.shortDescription}[[/zh]]\n[[en]]${presentation.en.shortDescription}[[/en]]`,
      content: `[[zh]]${presentation.zh.content}[[/zh]]\n[[en]]${presentation.en.content}[[/en]]`,
      coverImage: presentation.cover.url,
      status: mode === "package" ? "draft" : "published",
    });
    expect(mocks.candidatesCreate.mock.calls[0]?.[0].data.validationReport.presentation).toEqual(presentation);
    expect(mocks.revalidateTag).toHaveBeenCalledWith("public-tools");
  });

  it("refreshes presentation on a link-to-package upgrade without skipping price review", async () => {
    mocks.candidatesFindUnique.mockResolvedValue({
      id: "candidate-link", batchId: "batch-1", commitSha: commit, status: "published", fileId: null, toolId: "tool-link",
    });
    const response = await POST(request({ workerId: "runner-1", leaseToken, result: candidateResult({ presentation }) }), context);

    expect(response.status).toBe(200);
    expect(mocks.toolsCreate).not.toHaveBeenCalled();
    expect(mocks.toolsUpdate.mock.calls[0]?.[0].data).toMatchObject({ name: presentation.zh.name, englishName: presentation.en.name, coverImage: presentation.cover.url });
    expect(mocks.toolsUpdate.mock.calls[0]?.[0].data.systemRequirement).toContain("[[en]]See the project description");
    expect(mocks.candidatesUpdate.mock.calls[0]?.[0].data).toMatchObject({ status: "pending_pricing", validationReport: { presentation } });
  });

  it("rejects incomplete languages and untrusted image locations before any write", async () => {
    for (const invalid of [
      { ...presentation, en: undefined },
      { ...presentation, cover: { ...presentation.cover, url: "https://attacker.example/private.png" } },
    ]) {
      const response = await POST(request({ workerId: "runner-1", leaseToken, result: repositoryLinkResult({ presentation: invalid }) }), context);
      expect(response.status).toBe(400);
    }
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("upgrades an existing link listing into a package awaiting price review without creating a duplicate", async () => {
    mocks.candidatesFindUnique.mockResolvedValue({
      id: "candidate-link", batchId: "batch-1", commitSha: commit, status: "published", fileId: null, toolId: "tool-link",
    });
    const response = await POST(request({ workerId: "runner-1", leaseToken, result: candidateResult() }), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, candidateId: "candidate-link", state: "pending_pricing", deliveryMode: "package" });
    expect(mocks.toolsCreate).not.toHaveBeenCalled();
    expect(mocks.filesCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ toolId: "tool-link" }) }));
    expect(mocks.candidatesUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "candidate-link" },
      data: expect.objectContaining({ status: "pending_pricing", fileId: "file-1", batchId: "batch-1" }),
    }));
  });

  it("does not write a candidate when the uploaded object or license does not pass", async () => {
    const bad = candidateResult({ licenseSpdx: "GPL-3.0-only" });
    const response = await POST(request({ workerId: "runner-1", leaseToken, result: bad }), context);
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
