import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { tool: { findFirst: mocks.findFirst } } }));
import { GET } from "./route";

describe("public generated workflow cover", () => {
  beforeEach(() => vi.clearAllMocks());
  it("only renders a published workflow with bounded safe SVG headers", async () => {
    mocks.findFirst.mockResolvedValue({ name: "MCP 工具集", englishName: "MCP Tools", shortDescription: "MCP servers", aiWorkflowCandidate: { repositoryOwner: "example", repositoryName: "mcp-tools" } });
    const response = await GET(new Request("https://example.com"), { params: Promise.resolve({ slug: "ai-workflow-123-mcp-tools" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
    expect(response.headers.get("content-security-policy")).toContain("sandbox");
    expect(mocks.findFirst.mock.calls[0][0].where).toEqual({ OR: [{ slug: "ai-workflow-123-mcp-tools" }, { aiWorkflowCandidate: { repositoryId: "123" } }], type: "ai_workflow", status: "published" });
    expect(await response.text()).toContain("MCP Tools");
  });
  it("does not expose unpublished or missing projects", async () => {
    mocks.findFirst.mockResolvedValue(null);
    expect((await GET(new Request("https://example.com"), { params: Promise.resolve({ slug: "ai-workflow-123-missing" }) })).status).toBe(404);
  });
  it("rejects non-workflow paths before reading the database", async () => {
    expect((await GET(new Request("https://example.com"), { params: Promise.resolve({ slug: "../../secret" }) })).status).toBe(404);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });
});
