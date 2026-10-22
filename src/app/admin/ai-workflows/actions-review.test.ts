import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(), findUnique: vi.fn(), audit: vi.fn(), revalidatePath: vi.fn(), revalidateTag: vi.fn(),
  archiveReady: vi.fn(), candidateUpdate: vi.fn(), toolUpdate: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/db", () => ({ prisma: { aiWorkflowCandidate: { findUnique: mocks.findUnique }, $transaction: mocks.transaction } }));
vi.mock("@/lib/admin-audit", () => ({ writeAdminAuditLog: mocks.audit, createAdminAuditCreateData: (input: unknown) => input, getAdminAuditRequestContext: async () => ({}) }));
vi.mock("@/lib/ai-workflows/rules", async (original) => ({ ...await original<object>(), isAiWorkflowArchiveReady: mocks.archiveReady }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath, revalidateTag: mocks.revalidateTag }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); } }));

import { decideAiWorkflowPriceAction, publishAiWorkflowIntroductionAction } from "./actions";
const stamp = new Date("2026-10-21T10:00:00.000Z");
const sha = "a".repeat(40);
const presentation = {
  zh: { name: "中文新标题", shortDescription: "中文新简介", content: "## 项目简介\n中文新正文" },
  en: { name: "New title", shortDescription: "New summary", content: "## Project overview\nNew body" },
  cover: { url: "/api/ai-workflows/covers/ai-workflow-123-demo", source: "generated" },
};
function fixture() {
  return { id: "candidate-1", toolId: "tool-1", updatedAt: stamp, status: "reviewing", repositoryId: "123", repositoryUrl: "https://github.com/example/demo", repositoryOwner: "example", repositoryName: "demo", commitSha: sha, sourceFingerprint: `123:${sha}`, licenseSpdx: "MIT", licenseUrl: `https://github.com/example/demo/blob/${sha}/LICENSE`, projectType: "workflow", githubStars: 100, fileId: null as string | null, file: null as object | null, packageVersion: null, packageSha256: null, verifiedEnvironments: [], failureReason: "NO_LOCKED_NODE_TEST_SUITE",
    validationReport: { source: { deliveryMode: "repository_link", repositoryId: "123", repositoryUrl: "https://github.com/example/demo", commitSha: sha, updatedAt: "2026-10-21T00:00:00.000Z", language: "TypeScript" }, license: { spdx: "MIT", filePath: "LICENSE" }, publication: { mode: "repository_link", reason: "NO_LOCKED_NODE_TEST_SUITE", enheDownloadPackageAvailable: false }, presentation },
    tool: { id: "tool-1", slug: "ai-workflow-123-demo", type: "ai_workflow", status: "draft", name: "人工编辑标题", englishName: "Edited title", shortDescription: "[[zh]]人工编辑简介[[/zh]][[en]]Edited summary[[/en]]", content: "[[zh]]人工编辑正文[[/zh]][[en]]Edited body[[/en]]", coverImage: presentation.cover.url, updatedAt: stamp, downloadFileId: null as string | null, downloadPrice: 0, isDownloadPaid: false, onlineUrl: "https://github.com/example/demo" },
  };
}
function form() {
  const value = new FormData();
  value.set("candidateId", "candidate-1"); value.set("contentReviewed", "on");
  value.set("candidateUpdatedAt", stamp.toISOString()); value.set("toolUpdatedAt", stamp.toISOString());
  return value;
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.requireAdmin.mockResolvedValue({ id: "admin-1" });
  mocks.findUnique.mockResolvedValue(fixture()); mocks.candidateUpdate.mockResolvedValue({ count: 1 }); mocks.toolUpdate.mockResolvedValue({ count: 1 });
  mocks.transaction.mockImplementation(async (fn) => fn({ aiWorkflowCandidate: { updateMany: mocks.candidateUpdate }, tool: { updateMany: mocks.toolUpdate }, adminAuditLog: { create: mocks.audit } }));
});

describe("human approval of workflow introductions", () => {
  it("requires administrator authorization before reading the draft", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("Unauthorized"));
    await expect(publishAiWorkflowIntroductionAction(form())).rejects.toThrow("Unauthorized");
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
  it("does not publish without explicit content approval", async () => {
    const data = form(); data.delete("contentReviewed");
    await expect(publishAiWorkflowIntroductionAction(data)).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it.each(["package", "license", "stale", "translation", "evidence"])("blocks an ineligible %s draft", async (reason) => {
    const item = fixture();
    if (reason === "package") item.fileId = "file-1";
    if (reason === "license") item.licenseSpdx = "UNKNOWN";
    if (reason === "stale") item.tool.updatedAt = new Date("2026-10-21T11:00:00Z");
    if (reason === "translation") item.tool.content = "只有中文介绍，尚未翻译。";
    if (reason === "evidence") item.failureReason = "LICENSE_REJECTED";
    mocks.findUnique.mockResolvedValue(item);
    await expect(publishAiWorkflowIntroductionAction(form())).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("publishes only the reviewed current draft and records approval", async () => {
    await expect(publishAiWorkflowIntroductionAction(form())).rejects.toThrow("introductionPublished=1");
    expect(mocks.toolUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "tool-1", updatedAt: stamp, status: "draft" }), data: { status: "published" } }));
    expect(mocks.candidateUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "published" } }));
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ adminId: "admin-1", action: "ai_workflow.introduction.publish" }) }));
    expect(mocks.revalidateTag).toHaveBeenCalledWith("public-tools");
  });
  it("rejects a change racing the review without recording success", async () => {
    mocks.toolUpdate.mockResolvedValue({ count: 0 });
    await expect(publishAiWorkflowIntroductionAction(form())).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("does not report publication when its transactional audit fails", async () => {
    mocks.audit.mockRejectedValueOnce(new Error("Audit failed"));
    await expect(publishAiWorkflowIntroductionAction(form())).rejects.toThrow("Audit failed");
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });
});

describe("package review preserves delivery gates", () => {
  it.each(["draft", "published"])("rejects a package without removing a previously approved %s introduction", async (status) => {
    const item = fixture(); item.status = "pending_pricing"; item.tool.status = status;
    mocks.findUnique.mockResolvedValue(item);
    const data = form(); data.set("decision", "reject"); data.delete("contentReviewed");
    await expect(decideAiWorkflowPriceAction(data)).rejects.toThrow("candidateRejected=1");
    expect(mocks.toolUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ updatedAt: stamp, status }), data: { status: status === "draft" ? "offline" : "published" } }));
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "ai_workflow.candidate.reject" }) }));
  });
  it("blocks a stale rejection before changing either record", async () => {
    const item = fixture(); item.status = "pending_pricing"; item.updatedAt = new Date("2026-10-21T11:00:00Z");
    mocks.findUnique.mockResolvedValue(item);
    const data = form(); data.set("decision", "reject");
    await expect(decideAiWorkflowPriceAction(data)).rejects.toThrow("内容已变化");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("preserves manually edited package drafts when approving them", async () => {
    const item = fixture(); item.status = "pending_pricing"; item.fileId = "file-1"; item.tool.downloadFileId = "file-1"; item.file = { id: "file-1" };
    mocks.findUnique.mockResolvedValue(item); mocks.archiveReady.mockReturnValue(true);
    const data = form(); data.set("decision", "free");
    await expect(decideAiWorkflowPriceAction(data)).rejects.toThrow("priceConfirmed=1");
    expect(mocks.archiveReady).toHaveBeenCalledWith(expect.objectContaining({ productName: "人工编辑标题", productContent: item.tool.content }));
    expect(mocks.toolUpdate.mock.calls[0][0].data).not.toHaveProperty("content");
  });
  it("requires content approval as well as a price choice", async () => {
    mocks.findUnique.mockResolvedValue({ ...fixture(), status: "pending_pricing" });
    const data = form(); data.set("decision", "free"); data.delete("contentReviewed");
    await expect(decideAiWorkflowPriceAction(data)).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it.each([false, true])("applies a reviewed upgrade only if archive checks pass: %s", async (ready) => {
    const item = fixture(); item.status = "pending_pricing"; item.tool.status = "published"; item.fileId = "file-1"; item.tool.downloadFileId = "file-1"; item.file = { id: "file-1" };
    mocks.findUnique.mockResolvedValue(item); mocks.archiveReady.mockReturnValue(ready);
    const data = form(); data.set("decision", "free");
    await expect(decideAiWorkflowPriceAction(data)).rejects.toThrow(ready ? "priceConfirmed=1" : "priceSavedPendingArchive=1");
    expect(mocks.archiveReady).toHaveBeenCalled();
    if (ready) expect(mocks.toolUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ name: "中文新标题", status: "published", downloadFileId: "file-1" }) }));
    else expect(mocks.toolUpdate).not.toHaveBeenCalled();
  });
});
