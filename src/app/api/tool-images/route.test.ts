import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  getPublicSoftwareCatalogCovers: vi.fn(),
  getSecureCosMediaUrl: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { tool: { findFirst: mocks.findFirst } },
}));

vi.mock("@/lib/storage", () => ({
  getSecureCosMediaUrl: mocks.getSecureCosMediaUrl,
}));

vi.mock("@/lib/public-content", () => ({
  getPublicSoftwareCatalogCovers: mocks.getPublicSoftwareCatalogCovers,
}));

import { GET } from "./route";

describe("public tool image proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves an opaque published tool id to a short-lived media redirect", async () => {
    const source =
      "https://enhe-ai-tools-1303691623.cos.ap-shanghai.myqcloud.com/tool-cover-a-skill/cover.png";
    const signedUrl = "https://signed.example/temporary-cover.png";
    mocks.findFirst.mockResolvedValue({ coverImage: source });
    mocks.getPublicSoftwareCatalogCovers.mockResolvedValue([
      { id: "tool-1", coverImage: source },
    ]);
    mocks.getSecureCosMediaUrl.mockResolvedValue(signedUrl);

    const response = await GET(
      new Request("https://www.enhe-tech.com.cn/api/tool-images?id=tool-1"),
    );

    expect(mocks.getPublicSoftwareCatalogCovers).toHaveBeenCalledOnce();
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.getSecureCosMediaUrl).toHaveBeenCalledWith(source);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(signedUrl);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("rejects an unapproved external cover returned by the database", async () => {
    mocks.findFirst.mockResolvedValue({
      coverImage: "https://tracker.example/cover.png",
    });
    mocks.getPublicSoftwareCatalogCovers.mockResolvedValue([
      { id: "tool-2", coverImage: "https://tracker.example/cover.png" },
    ]);

    const response = await GET(
      new Request("https://www.enhe-tech.com.cn/api/tool-images?id=tool-2"),
    );

    expect(response.status).toBe(404);
    expect(mocks.getSecureCosMediaUrl).not.toHaveBeenCalled();
  });

  it("does not resolve an opaque id outside the cached public catalog", async () => {
    mocks.getPublicSoftwareCatalogCovers.mockResolvedValue([]);

    const response = await GET(
      new Request("https://www.enhe-tech.com.cn/api/tool-images?id=private-tool"),
    );

    expect(response.status).toBe(404);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.getSecureCosMediaUrl).not.toHaveBeenCalled();
  });
});
