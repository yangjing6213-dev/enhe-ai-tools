import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tool: vi.fn(),
  currentUser: vi.fn(),
  toolPurchase: vi.fn(),
  workflowPurchase: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    tool: { findUnique: mocks.tool },
    toolPurchase: { findUnique: mocks.toolPurchase },
    aiWorkflowVersionPurchase: { findFirst: mocks.workflowPurchase },
  },
}));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.currentUser }));

import { POST } from "./route";

const params = { params: Promise.resolve({ id: "tool-1" }) };
const prompt = "Install the product using the following steps.";
const request = (origin = "https://www.enhe-tech.com.cn") => new Request("https://www.enhe-tech.com.cn/api/tools/tool-1/install-prompt", {
  method: "POST",
  headers: { origin, "content-type": "application/json" },
  body: "{}",
});

function software(overrides: Record<string, unknown> = {}) {
  return {
    type: "software",
    status: "published",
    deliveryMode: "how_to",
    installPrompt: prompt,
    isDownloadPaid: false,
    downloadPrice: 0,
    downloadFileId: "file-1",
    priceSpecs: [],
    aiWorkflowCandidate: null,
    ...overrides,
  };
}

describe("install prompt endpoint", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.tool.mockResolvedValue(software());
    mocks.currentUser.mockResolvedValue(null);
    mocks.toolPurchase.mockResolvedValue(null);
    mocks.workflowPurchase.mockResolvedValue(null);
  });

  it("returns a free published prompt without placing it in a cache", async () => {
    const response = await POST(request(), params);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect((await response.json()).prompt).toBe(prompt);
    expect(mocks.currentUser).not.toHaveBeenCalled();
  });

  it("does not return prompts for unpublished or link-mode products", async () => {
    mocks.tool.mockResolvedValueOnce(software({ status: "draft" }));
    expect((await POST(request(), params)).status).toBe(404);
    mocks.tool.mockResolvedValueOnce(software({ deliveryMode: "link" }));
    const response = await POST(request(), params);
    expect(response.status).toBe(404);
    expect(await response.json()).not.toHaveProperty("prompt");
  });

  it("requires an active purchase before returning a paid software prompt", async () => {
    mocks.tool.mockResolvedValue(software({ isDownloadPaid: true, downloadPrice: 12 }));
    expect((await POST(request(), params)).status).toBe(401);

    mocks.currentUser.mockResolvedValue({ id: "user-1" });
    expect((await POST(request(), params)).status).toBe(403);
    expect(mocks.toolPurchase).toHaveBeenCalledWith({ where: { userId_toolId: { userId: "user-1", toolId: "tool-1" } }, select: { id: true } });

    mocks.toolPurchase.mockResolvedValue({ id: "purchase-1" });
    expect((await POST(request(), params)).status).toBe(200);
  });

  it("checks the activated workflow entitlement and rejects cross-site requests", async () => {
    const workflow = software({ type: "ai_workflow", isDownloadPaid: true, downloadPrice: 20, aiWorkflowCandidate: {
      status: "published", fileId: "file-1", priceDecision: "paid", confirmedPrice: 20,
    } });
    mocks.tool.mockResolvedValue(workflow);
    mocks.currentUser.mockResolvedValue({ id: "user-1" });
    mocks.workflowPurchase.mockResolvedValue({ id: "workflow-purchase-1" });

    const crossSite = await POST(request("https://attacker.example"), params);
    expect(crossSite.status).toBe(403);
    expect(mocks.tool).not.toHaveBeenCalled();

    const response = await POST(request(), params);
    expect(response.status).toBe(200);
    expect(mocks.workflowPurchase).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      userId: "user-1",
      toolId: "tool-1",
      order: { is: expect.objectContaining({ orderStatus: "activated", refundRecords: { none: { status: "pending" } } }) },
    }) }));
  });
});
