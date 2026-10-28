import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  prisma: {
    tool: { findUnique: vi.fn(), update: vi.fn() },
    toolPurchase: { findUnique: vi.fn() },
    aiWorkflowVersionPurchase: { findFirst: vi.fn() },
    aiWorkflowDownloadEvent: { createMany: vi.fn() },
    downloadLog: { count: vi.fn(), create: vi.fn() },
    file: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: db.prisma }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: db.getCurrentUser }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));

import { assertDownloadAccess } from "@/lib/access";

const file = { id: "file-1", storageType: "external", url: "https://example.test/download" };
const paidTool = {
  id: "tool-1", type: "software", status: "published", slug: "paid-tool", name: "Paid tool", englishName: "Paid tool",
  isDownloadPaid: true, downloadPrice: 5, priceSpecs: [], downloadFile: file,
  downloadFileId: file.id, aiWorkflowCandidate: null,
};

describe("product download counting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.getCurrentUser.mockResolvedValue({ id: "user-1" });
    db.prisma.tool.findUnique.mockResolvedValue(paidTool);
    db.prisma.toolPurchase.findUnique.mockResolvedValue({ id: "purchase-1" });
    db.prisma.aiWorkflowVersionPurchase.findFirst.mockResolvedValue({ file });
    db.prisma.aiWorkflowDownloadEvent.createMany.mockResolvedValue({ count: 1 });
    db.prisma.downloadLog.count.mockResolvedValue(0);
    db.prisma.$transaction.mockImplementation((callback) => callback(db.prisma));
  });

  it.each(["external", "local", "cos"])("does not count paid %s delivery again after purchase", async (storageType) => {
    db.prisma.tool.findUnique.mockResolvedValue({ ...paidTool, downloadFile: { ...file, storageType } });
    await assertDownloadAccess(paidTool.id);
    await assertDownloadAccess(paidTool.id);
    expect(db.prisma.tool.update).not.toHaveBeenCalled();
    expect(db.prisma.downloadLog.create).toHaveBeenCalledTimes(2);
    expect(db.prisma.file.update).toHaveBeenCalledTimes(2);
  });

  it("keeps actual free tool download counts", async () => {
    db.prisma.tool.findUnique.mockResolvedValue({ ...paidTool, isDownloadPaid: false, downloadPrice: 0 });
    await assertDownloadAccess(paidTool.id);
    expect(db.prisma.tool.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: paidTool.id }, data: { downloadCount: { increment: 1 } },
    });
  });

  it.each(["online", "skill_learning"])("does not count paid %s access again when payment is defined by a price plan", async (type) => {
    db.prisma.tool.findUnique.mockResolvedValue({
      ...paidTool, type, isDownloadPaid: false, downloadPrice: 0,
      priceSpecs: [{ price: 5, status: "active" }],
    });
    await assertDownloadAccess(paidTool.id);
    expect(db.prisma.tool.update).not.toHaveBeenCalled();
  });

  it.each([true, false])("counts workflow acquisition only on free delivery (paid=%s)", async (isPaid) => {
    db.prisma.tool.findUnique.mockResolvedValue({
      ...paidTool, type: "ai_workflow", isDownloadPaid: isPaid, downloadPrice: isPaid ? 10 : 0,
      aiWorkflowCandidate: { status: "published", fileId: file.id, priceDecision: isPaid ? "paid" : "free", confirmedPrice: isPaid ? 10 : 0 },
    });
    if (!isPaid) db.getCurrentUser.mockResolvedValue(null);
    await assertDownloadAccess(paidTool.id, "anonymous-visitor");
    db.prisma.aiWorkflowDownloadEvent.createMany.mockResolvedValue({ count: 0 });
    await assertDownloadAccess(paidTool.id, "anonymous-visitor");
    expect(db.prisma.tool.update).toHaveBeenCalledTimes(isPaid ? 0 : 1);
    expect(db.prisma.file.update).toHaveBeenCalledTimes(1);
  });

  it("does not count unpaid attempts", async () => {
    db.prisma.toolPurchase.findUnique.mockResolvedValue(null);
    await expect(assertDownloadAccess(paidTool.id)).rejects.toThrow("pay-required");
    expect(db.prisma.tool.update).not.toHaveBeenCalled();
    expect(db.prisma.file.update).not.toHaveBeenCalled();
  });
});
