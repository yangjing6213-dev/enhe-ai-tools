import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { buildAiWorkflowSourceArchiveObjectKey } from "@/lib/ai-workflows/cos";

const { findToolMock, rateLimitMock } = vi.hoisted(() => ({
  findToolMock: vi.fn(),
  rateLimitMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { tool: { findFirst: (input: unknown) => findToolMock(input) } },
}));
vi.mock("@/lib/customer-support-rate-limit", () => ({
  consumeCustomerSupportRateLimit: (key: string) => rateLimitMock(key),
}));

const commitSha = "a".repeat(40);
const archiveSha = "b".repeat(64);
const objectKey = buildAiWorkflowSourceArchiveObjectKey("123456", commitSha, archiveSha);

function makeTool(overrides: Record<string, unknown> = {}) {
  return {
    id: "tool-1",
    slug: "sample-workflow",
    type: "ai_workflow",
    status: "published",
    aiWorkflowCandidate: {
      status: "published",
      repositoryId: "123456",
      repositoryUrl: "https://github.com/example/workflow",
      repositoryOwner: "example",
      repositoryName: "workflow",
      commitSha,
      licenseSpdx: "MIT",
      validationReport: {
        sourceArchive: {
          deliveryMode: "cos",
          upstreamUrl: `https://github.com/example/workflow/archive/${commitSha}.zip`,
          archive: {
            sha256: archiveSha,
            size: 2048,
            crc64: "1234567890123",
            remoteSize: 2048,
            remoteCrc64: "1234567890123",
            anonymousReadDenied: true,
            bucket: "enhe-downloads-1303691623",
            region: "ap-shanghai",
            objectKey,
            filePath: `cos://enhe-downloads-1303691623/${objectKey}`,
            contentType: "application/zip",
          },
        },
      },
      ...overrides,
    },
  };
}

const context = { params: Promise.resolve({ slug: "sample-workflow" }) };

function makeRequest() {
  return new Request("https://www.enhe-tech.com.cn/api/ai-workflows/sample-workflow/source-archive", {
    headers: { "x-real-ip": "203.0.113.10" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  rateLimitMock.mockReturnValue(true);
  findToolMock.mockResolvedValue(makeTool());
  vi.stubEnv("COS_SECRET_ID", "test-id");
  vi.stubEnv("COS_SECRET_KEY", "test-key");
  vi.stubEnv("COS_DOWNLOAD_BUCKET", "enhe-downloads-1303691623");
  vi.stubEnv("COS_REGION", "ap-shanghai");
});

describe("GET /api/ai-workflows/[slug]/source-archive", () => {
  it("redirects a published, verified mirror to a short-lived private COS URL", async () => {
    const response = await GET(makeRequest(), context);
    const location = response.headers.get("location");
    expect(response.status).toBe(302);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(location).toContain("enhe-downloads-1303691623.cos.ap-shanghai.myqcloud.com");
    expect(location).toContain("ai-workflows/source/123456");
    expect(location).toContain("response-content-disposition");
  });

  it("falls back to the fixed GitHub ZIP when a mirror is not recorded", async () => {
    findToolMock.mockResolvedValue(makeTool({ validationReport: null }));
    const response = await GET(makeRequest(), context);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`https://github.com/example/workflow/archive/${commitSha}.zip`);
  });

  it("falls back to GitHub when private COS signing is unavailable", async () => {
    vi.stubEnv("COS_SECRET_ID", "");
    vi.stubEnv("COS_SECRET_KEY", "");
    const response = await GET(makeRequest(), context);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`https://github.com/example/workflow/archive/${commitSha}.zip`);
  });

  it("uses the verified commit saved in older validation records", async () => {
    findToolMock.mockResolvedValue(makeTool({ commitSha: null, validationReport: { source: { commitSha } } }));
    const response = await GET(makeRequest(), context);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain(`/archive/${commitSha}.zip`);
  });

  it("does not expose downloads for unpublished workflows or when the request limit is reached", async () => {
    findToolMock.mockResolvedValue(null);
    expect((await GET(makeRequest(), context)).status).toBe(404);

    rateLimitMock.mockReturnValue(false);
    expect((await GET(makeRequest(), context)).status).toBe(429);
    expect(findToolMock).toHaveBeenCalledOnce();
  });
});
