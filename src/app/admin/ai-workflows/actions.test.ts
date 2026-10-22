import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  randomInt: vi.fn(),
  batches: {
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  collectionSetting: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  redirect: vi.fn((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); }),
  revalidatePath: vi.fn(),
  requireAdmin: vi.fn(),
  topics: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  tx: {
    aiWorkflowBatch: { updateMany: vi.fn() },
    aiWorkflowCollectionSetting: { findUnique: vi.fn(), upsert: vi.fn() },
    aiWorkflowTopic: { updateMany: vi.fn(), upsert: vi.fn() },
  },
  transaction: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("node:crypto", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:crypto")>()),
  randomInt: mocks.randomInt,
}));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/admin-audit", () => ({ writeAdminAuditLog: mocks.audit }));
vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
    aiWorkflowBatch: mocks.batches,
    aiWorkflowCollectionSetting: mocks.collectionSetting,
    aiWorkflowTopic: mocks.topics,
  },
}));

import {
  requestAiWorkflowBatchAction,
  saveAiWorkflowScheduleAction,
  saveAiWorkflowTopicsAction,
} from "@/app/admin/ai-workflows/actions";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AI_WORKFLOW_WORKER_TOKEN", "test-worker-token-only");
  vi.stubEnv("COS_SECRET_ID", "test-secret-id-only");
  vi.stubEnv("COS_SECRET_KEY", "test-secret-key-only");
  vi.stubEnv("COS_REGION", "ap-shanghai");
  vi.stubEnv("COS_STATIC_BUCKET", "enhe-static-1303691623");
  vi.stubEnv("COS_DOWNLOAD_BUCKET", "enhe-downloads-1303691623");
  mocks.requireAdmin.mockResolvedValue({ id: "admin-1" });
  mocks.randomInt.mockReturnValue(0);
  mocks.transaction.mockImplementation(async (callback: (tx: typeof mocks.tx) => Promise<unknown>) => callback(mocks.tx));
  mocks.tx.aiWorkflowCollectionSetting.findUnique.mockResolvedValue({ topicListVersion: 3 });
  mocks.collectionSetting.findUnique.mockResolvedValue({
    scheduledTaskRegisteredAt: new Date("2026-10-19T00:00:00.000Z"),
    scheduledTaskEnabledAt: new Date("2026-10-19T00:00:00.000Z"),
    topicListConfirmedAt: null,
  });
  mocks.topics.count.mockResolvedValue(1);
  mocks.topics.findMany.mockResolvedValue([{ id: "topic-1", name: "Workflows", sortOrder: 0 }]);
});

afterEach(() => vi.unstubAllEnvs());

describe("AI Workflow admin collection safeguards", () => {
  it("stores the supplied ordered themes and search directions as confirmed topics", async () => {
    const rows = [
      ["工作效率", "搜索趋势 / SaaS 产品发布 / 企业预算"],
      ["视频生成", "创作者社区 / 模型更新 / 工具榜单"],
      ["内容创作", "社媒讨论 / 模板市场 / 自媒体需求"],
      ["编程开发", "开发者工具 / GitHub 生态 / IDE 集成"],
      ["学习教育", "课程产品 / 家庭学习 / 语言学习"],
      ["搜索研究", "AI 搜索 / 知识库 / 研究助手"],
      ["营销销售", "CRM / 广告素材 / 客户触达"],
      ["办公自动化", "文档表格 / 会议纪要 / 流程编排"],
      ["情感陪伴", "消费应用 / 社区反馈 / 长时互动"],
      ["财务法律辅助", "高风险咨询 / 合同审阅 / 合规工具"],
    ];
    const form = new FormData();
    form.set("topics", rows.map(([name, directions]) => `${name} | ${directions}`).join("\n"));
    form.set("topicListConfirmed", "on");

    await expect(saveAiWorkflowTopicsAction(form)).rejects.toThrow("NEXT_REDIRECT:/admin/ai-workflows?topicsSaved=1");

    expect(mocks.tx.aiWorkflowTopic.upsert).toHaveBeenCalledTimes(rows.length);
    expect(mocks.tx.aiWorkflowTopic.upsert.mock.calls.map(([input]) => input.create)).toEqual(rows.map(([name, searchDirections], sortOrder) => expect.objectContaining({
      name,
      englishName: null,
      searchDirections,
      sortOrder,
      isEnabled: true,
    })));
    expect(mocks.tx.aiWorkflowCollectionSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ topicListConfirmedAt: expect.any(Date), isEnabled: false }),
    }));
  });

  it("saves topic changes as unconfirmed and invalidates active batches", async () => {
    const form = new FormData();
    form.set("topics", "工作流自动化 | Workflow automation | GitHub releases / IDE integrations");

    await expect(saveAiWorkflowTopicsAction(form)).rejects.toThrow("NEXT_REDIRECT:/admin/ai-workflows?topicsSaved=1");

    expect(mocks.tx.aiWorkflowCollectionSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ topicListVersion: 4, topicListConfirmedAt: null, isEnabled: false }),
    }));
    expect(mocks.tx.aiWorkflowTopic.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ englishName: "Workflow automation", searchDirections: "GitHub releases / IDE integrations" }),
    }));
    expect(mocks.tx.aiWorkflowBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: { in: ["queued", "paused", "running"] } },
      data: expect.objectContaining({ status: "failed", failureReason: "topic_list_changed", leaseTokenHash: null }),
    }));
  });

  it("cannot enable the daily schedule without a confirmed topic list", async () => {
    const form = new FormData();
    form.set("scheduleTime", "09:00");
    form.set("isEnabled", "on");

    await expect(saveAiWorkflowScheduleAction(form)).rejects.toThrow("NEXT_REDIRECT:/admin/ai-workflows?scheduleNotReady=1");

    expect(mocks.collectionSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ isEnabled: false }),
    }));
  });

  it("does not queue manual work until the topic list is confirmed", async () => {
    await expect(requestAiWorkflowBatchAction()).rejects.toThrow("NEXT_REDIRECT:/admin/ai-workflows?error=请先导入并核对已提供的有序主题清单。");
    expect(mocks.batches.create).not.toHaveBeenCalled();
  });

  it("randomly selects an enabled topic and locks its search directions into the batch", async () => {
    mocks.collectionSetting.findUnique.mockResolvedValue({
      topicListVersion: 7,
      topicListConfirmedAt: new Date("2026-10-20T00:00:00.000Z"),
      isPaused: false,
    });
    mocks.topics.findMany.mockResolvedValue([
      { id: "topic-1", name: "工作效率", searchDirections: "工作流与效率方法", sortOrder: 0 },
      { id: "topic-2", name: "视频生成", searchDirections: "视频生成 / 视频编辑 / 视频生产", sortOrder: 1 },
    ]);
    mocks.randomInt.mockReturnValue(1);
    mocks.batches.findUnique.mockResolvedValue(null);
    mocks.batches.findFirst.mockResolvedValue(null);
    mocks.batches.count.mockResolvedValue(0);
    mocks.batches.create.mockResolvedValue({ id: "batch-1" });

    await expect(requestAiWorkflowBatchAction()).rejects.toThrow("NEXT_REDIRECT:/admin/ai-workflows?batchQueued=1");

    expect(mocks.batches.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        topicId: "topic-2",
        topicNameSnapshot: "视频生成",
        topicSearchDirectionsSnapshot: "视频生成 / 视频编辑 / 视频生产",
        topicOrderVersion: 7,
      }),
    }));
    expect(mocks.randomInt).toHaveBeenCalledWith(2);
  });
});
