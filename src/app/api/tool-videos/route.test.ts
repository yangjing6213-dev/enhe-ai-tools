import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ tool: vi.fn(), tutorial: vi.fn(), demo: vi.fn(), sign: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: {
  tool: { findFirst: mocks.tool }, tutorial: { findFirst: mocks.tutorial }, productDemo: { findFirst: mocks.demo }
} }));
vi.mock("@/lib/storage", async (original) => ({
  ...await original<typeof import("@/lib/storage")>(), getSecureCosMediaUrl: mocks.sign
}));
import { GET } from "./route";

describe("public video signing authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("TENCENT_COS_BUCKET", "bucket");
    vi.stubEnv("TENCENT_COS_REGION", "region");
    mocks.sign.mockResolvedValue(new URL("https://media.example/video.mp4?signed=fixture"));
    mocks.tool.mockResolvedValue(null);
    mocks.tutorial.mockResolvedValue(null);
    mocks.demo.mockResolvedValue(null);
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each(["ai-skills/paid.zip", "payment-proofs/private.png", "forum-media/private.mp4", "tool-videos/../private.mp4"])("never signs a non-product namespace: %s", async (key) => {
    const response = await GET(new Request(`https://site.example/api/tool-videos?src=${encodeURIComponent(`cos://bucket/${key}`)}`));
    expect(response.status).toBe(404);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("does not sign unreferenced or unpublished video keys", async () => {
    const response = await GET(new Request("https://site.example/api/tool-videos?src=cos%3A%2F%2Fbucket%2Ftool-videos%2Fdraft.mp4"));
    expect(response.status).toBe(404);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("supports configured COS HTTPS URLs and matches their canonical published reference", async () => {
    mocks.tool.mockResolvedValue({ id: "published-source" });
    const source = "https://bucket.cos.region.myqcloud.com/tool-videos/demo.mp4";
    expect((await GET(new Request(`https://site.example/api/tool-videos?src=${encodeURIComponent(source)}`))).status).toBe(307);
    const query = mocks.tool.mock.calls[0][0];
    expect(query.where.OR[0].videoUrl.in).toContain("cos://bucket/tool-videos/demo.mp4");
    expect(query.where.OR[0].videoUrl.in).toContain(source);
  });
  it.each(["tool", "tutorial", "demo"] as const)("preserves published %s playback via the existing src API", async (kind) => {
    mocks[kind].mockResolvedValue({ id: "published-source" });
    const response = await GET(new Request("https://site.example/api/tool-videos?src=cos%3A%2F%2Fbucket%2Ftool-videos%2Fdemo.mp4"));
    expect(response.status).toBe(307);
    expect(mocks.sign).toHaveBeenCalledWith("cos://bucket/tool-videos/demo.mp4");
    expect(mocks.tool).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "published" }) }));
    expect(mocks.tutorial).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "active", tool: { status: "published" } }) }));
    expect(mocks.demo).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "published" }) }));
  });
});
