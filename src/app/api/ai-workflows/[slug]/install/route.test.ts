import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { getCurrentUserMock, findToolMock, findPurchaseMock, signUrlMock, cosConfigMock, rateLimitMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  findToolMock: vi.fn(),
  findPurchaseMock: vi.fn(),
  signUrlMock: vi.fn(),
  cosConfigMock: vi.fn(),
  rateLimitMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    tool: { findFirst: (input: unknown) => findToolMock(input) },
    aiWorkflowVersionPurchase: { findFirst: (input: unknown) => findPurchaseMock(input) },
  },
}));
vi.mock("@/lib/ai-workflows/cos", () => ({
  getAiWorkflowCosConfig: () => cosConfigMock(),
  getAiWorkflowDownloadUrl: (file: unknown) => signUrlMock(file),
}));
vi.mock("@/lib/customer-support-rate-limit", () => ({ consumeCustomerSupportRateLimit: (key: string) => rateLimitMock(key) }));

const freeFile = {
  id: "file-1",
  fileName: "workflow.zip",
  filePath: "cos://enhe-downloads-1303691623/ai-workflows/1/commit/hash.zip",
  storageBucket: "enhe-downloads-1303691623",
  objectKey: "ai-workflows/1/commit/hash.zip",
  version: "a".repeat(40),
  sha256: "b".repeat(64),
};

function makeTool(isPaid = false) {
  return {
    id: "tool-1",
    slug: "sample-workflow",
    type: "ai_workflow",
    status: "published",
    downloadFileId: "file-1",
    downloadFile: freeFile,
    isDownloadPaid: isPaid,
    downloadPrice: isPaid ? 19 : 0,
    priceSpecs: [],
    aiWorkflowCandidate: {
      status: "published",
      fileId: "file-1",
      priceDecision: isPaid ? "paid" : "free",
      confirmedPrice: isPaid ? 19 : 0,
      repositoryUrl: "https://github.com/example/workflow",
      verifiedEnvironments: ["Windows 11"],
    },
  };
}

function makeRequest(body: unknown) {
  return new Request("https://www.enhe-tech.com.cn/api/ai-workflows/sample-workflow/install", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-real-ip": "203.0.113.10" },
    body: JSON.stringify(body),
  });
}

async function readBody(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue(null);
  findToolMock.mockResolvedValue(makeTool());
  findPurchaseMock.mockResolvedValue(null);
  cosConfigMock.mockReturnValue({ signExpiresSeconds: 3600 });
  signUrlMock.mockReturnValue("https://enhe-downloads-1303691623.cos.ap-shanghai.myqcloud.com/signed");
  rateLimitMock.mockReturnValue(true);
});

describe("POST /api/ai-workflows/[slug]/install", () => {
  const context = { params: Promise.resolve({ slug: "sample-workflow" }) };
  const body = { agent: "codex", runtime: "windows", locale: "zh" };

  it("creates a short-lived guest instruction for an explicitly free item", async () => {
    const response = await POST(makeRequest(body), context);
    const result = await readBody(response);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(result.instruction).toContain(freeFile.sha256);
    expect(result.instruction).toContain("https://enhe-downloads-1303691623.cos.ap-shanghai.myqcloud.com/signed");
    expect(signUrlMock).toHaveBeenCalledOnce();
  });

  it("does not issue a paid instruction before login and an active purchase", async () => {
    findToolMock.mockResolvedValue(makeTool(true));
    const anonymous = await POST(makeRequest(body), context);
    expect(anonymous.status).toBe(401);
    expect(signUrlMock).not.toHaveBeenCalled();

    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    const unpaid = await POST(makeRequest(body), context);
    expect(unpaid.status).toBe(403);
    expect(signUrlMock).not.toHaveBeenCalled();
  });

  it("does not issue an instruction for an unverified runtime", async () => {
    const response = await POST(makeRequest({ ...body, runtime: "docker" }), context);
    expect(response.status).toBe(400);
    expect(signUrlMock).not.toHaveBeenCalled();
  });

  it("applies the installation-link request limit", async () => {
    rateLimitMock.mockReturnValue(false);
    const response = await POST(makeRequest(body), context);
    expect(response.status).toBe(429);
    expect(signUrlMock).not.toHaveBeenCalled();
  });
});
