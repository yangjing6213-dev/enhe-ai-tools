import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildHomepageAvatarSrc, getHomepageAvatarVersion } from "@/lib/homepage-avatar";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), sign: vi.fn(), fetch: vi.fn(), readFile: vi.fn(), stat: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { comment: { findFirst: mocks.findFirst } } }));
vi.mock("node:fs/promises", () => ({ readFile: mocks.readFile, stat: mocks.stat }));
vi.mock("@/lib/storage", () => ({
  getSecureCosMediaUrl: mocks.sign,
  parseCosFilePath: (value: string) => {
    const match = /^cos:\/\/([^/]+)\/(.+)$/.exec(value);
    return match ? { bucket: match[1], key: match[2] } : null;
  },
  parseCosPublicUrl: () => null,
}));
vi.mock("@/lib/upload-path", () => ({ getUploadDiskPath: (value: string) => `/fixture${value}` }));

import { GET } from "./route";

function request(source: string, extra = "") {
  return new Request(`https://www.enhe-tech.com.cn${buildHomepageAvatarSrc("user-1", source)}${extra}`);
}

describe("public homepage avatar images", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("TENCENT_COS_BUCKET", "enhe-bucket");
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.sign.mockResolvedValue(new URL("https://enhe-bucket.cos.ap-shanghai.myqcloud.com/user-avatars/avatar.png?signature=fixture"));
    mocks.fetch.mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/png" } }));
  });

  it("uses a stable user-and-version URL shared by all of that user's homepage comments", () => {
    const source = "cos://enhe-bucket/user-avatars/avatar.png";
    expect(buildHomepageAvatarSrc("user-1", source)).toBe(buildHomepageAvatarSrc("user-1", source));
    expect(buildHomepageAvatarSrc("user-1", source)).not.toContain("cos:");
    expect(buildHomepageAvatarSrc("user-1", `${source}-new`)).not.toBe(buildHomepageAvatarSrc("user-1", source));
    expect(buildHomepageAvatarSrc("user-1", "/images/user-avatars/female/avatar-01.webp")).toBe("/images/user-avatars/female/avatar-01.webp");
  });

  it("only reads a homepage-approved avatar and streams bounded image bytes without exposing a signature", async () => {
    const source = "cos://enhe-bucket/user-avatars/avatar.png";
    mocks.findFirst.mockResolvedValue({ user: { avatar: source } });
    const response = await GET(request(source));
    expect(response.status).toBe(200);
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: { userId: "user-1", status: "approved", showOnHomepage: true }, select: { user: { select: { avatar: true } } } });
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=60, s-maxage=60");
    expect((await response.arrayBuffer()).byteLength).toBe(3);
    expect(mocks.fetch).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ redirect: "error", cache: "no-store" }));
  });

  it.each([
    "cos://enhe-bucket/payment-proofs/proof.png",
    "cos://enhe-bucket/ai-skills/private.png",
    "cos://other-bucket/user-avatars/avatar.png",
    "cos://enhe-bucket/user-avatars/../payment-proofs/proof.png",
    "cos://enhe-bucket/user-avatars/avatar.svg",
    "https://127.0.0.1/private.png",
    "/uploads/payment-proofs/proof.png",
  ])("does not sign or fetch disallowed stored source %s", async (source) => {
    mocks.findFirst.mockResolvedValue({ user: { avatar: source } });
    expect((await GET(request(source))).status).toBe(404);
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.readFile).not.toHaveBeenCalled();
  });

  it("rejects arbitrary source parameters, unavailable comments, and stale avatar versions", async () => {
    const source = "cos://enhe-bucket/user-avatars/avatar.png";
    expect((await GET(request(source, "&src=https://example.com/a.png"))).status).toBe(404);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    mocks.findFirst.mockResolvedValue(null);
    expect((await GET(request(source))).status).toBe(404);
    mocks.findFirst.mockResolvedValue({ user: { avatar: `${source}-updated` } });
    expect((await GET(request(source))).status).toBe(404);
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it("rejects non-image bodies and oversized upstream responses", async () => {
    const source = "cos://enhe-bucket/user-avatars/avatar.png";
    mocks.findFirst.mockResolvedValue({ user: { avatar: source } });
    const invalidHeaders: Record<string, string>[] = [{ "content-type": "text/html" }, { "content-type": "image/png", "content-length": String(9 * 1024 * 1024) }];
    for (const headers of invalidHeaders) {
      mocks.fetch.mockResolvedValue(new Response("invalid", { headers }));
      expect((await GET(request(source))).status).toBe(404);
    }
  });

  it("serves local public avatar uploads but does not accept a stale version", async () => {
    const source = "/uploads/user-avatars/avatar.png";
    mocks.findFirst.mockResolvedValue({ user: { avatar: source } });
    mocks.stat.mockResolvedValue({ isFile: () => true, size: 3 });
    mocks.readFile.mockResolvedValue(Buffer.from([1, 2, 3]));
    expect((await GET(request(source))).status).toBe(200);
    expect(mocks.readFile).toHaveBeenCalledWith("/fixture/uploads/user-avatars/avatar.png");
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(getHomepageAvatarVersion(source)).toMatch(/^[a-f0-9]{16}$/);
  });
});
