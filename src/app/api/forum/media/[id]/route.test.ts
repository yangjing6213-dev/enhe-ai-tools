import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), find: vi.fn(), signed: vi.fn(), fetch: vi.fn(), remove: vi.fn(), mark: vi.fn(), deleteStored: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/db", () => ({ prisma: { forumAttachment: { findUnique: mocks.find, deleteMany: mocks.remove, updateMany: mocks.mark } } }));
vi.mock("@/lib/forum-media-storage", () => ({ deleteForumMediaStoredFile: mocks.deleteStored }));
vi.mock("@/lib/storage", () => ({ getSecureCosMediaUrl: mocks.signed, parseCosFilePath: (path: string) => /^cos:\/\/[^/]+\/(.+)$/.test(path) ? { key: path.split("/").slice(3).join("/") } : null, resolvePrivateLocalUploadPath: () => null }));
import { DELETE, GET } from "./route";
const record = { id: "a-1", authorId: "u-1", kind: "video", filePath: "cos://bucket/forum-media/video.mp4", fileSize: 10, mimeType: "video/mp4", post: { status: "pending" }, reply: null };
const context = { params: Promise.resolve({ id: "a-1" }) };
function request(range?: string) { return new Request("https://enhe.test/api/forum/media/a-1", { headers: range ? { range } : {} }); }
describe("forum media visibility and streaming", () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubGlobal("fetch", mocks.fetch);
    mocks.user.mockResolvedValue(null); mocks.find.mockResolvedValue(record);
    mocks.signed.mockResolvedValue(new URL("https://private-storage.test/video?signature=secret"));
    mocks.fetch.mockResolvedValue(new Response("0123456789"));
    mocks.deleteStored.mockResolvedValue(true);
    mocks.mark.mockResolvedValue({ count: 1 });
    mocks.remove.mockResolvedValue({ count: 1 });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("hides pending and detached media from anonymous readers", async () => {
    expect((await GET(request(), context)).status).toBe(404);
    mocks.find.mockResolvedValueOnce({ ...record, post: null });
    expect((await GET(request(), context)).status).toBe(404);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("hides discarded draft media even from its owner", async () => {
    mocks.user.mockResolvedValueOnce({ id: "u-1", role: "user" });
    mocks.find.mockResolvedValueOnce({ ...record, discardedAt: new Date() });
    expect((await GET(request(), context)).status).toBe(404);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("lets the owner and administrator preview pending media without shared caching", async () => {
    for (const user of [{ id: "u-1", role: "user" }, { id: "admin", role: "admin" }]) {
      mocks.user.mockResolvedValueOnce(user);
      const response = await GET(request(), context);
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(response.headers.get("vary")).toBe("Cookie");
    }
    mocks.user.mockResolvedValueOnce({ id: "another", role: "user" });
    expect((await GET(request(), context)).status).toBe(404);
  });
  it("serves approved media through the site without revealing signed storage URLs", async () => {
    mocks.find.mockResolvedValueOnce({ ...record, post: { status: "approved" } });
    const response = await GET(request(), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toContain("must-revalidate");
    expect(await response.text()).toBe("0123456789");
  });
  it("requires both the reply and its topic to be approved", async () => {
    mocks.find.mockResolvedValueOnce({ ...record, post: null, reply: { status: "approved", post: { status: "rejected" } } });
    expect((await GET(request(), context)).status).toBe(404);
  });
  it("proxies video ranges and rejects invalid ranges before storage access", async () => {
    mocks.find.mockResolvedValue({ ...record, post: { status: "approved" } });
    mocks.fetch.mockResolvedValueOnce(new Response("2345", { status: 206 }));
    const response = await GET(request("bytes=2-5"), context);
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(response.headers.get("content-length")).toBe("4");
    expect(mocks.fetch).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ headers: { Range: "bytes=2-5" }, redirect: "error" }));
    expect((await GET(request("bytes=10-"), context)).status).toBe(416);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("allows owners to remove only their unassigned draft uploads", async () => {
    const input = new Request("https://enhe.test/api/forum/media/a-1", { method: "DELETE", headers: { origin: "https://enhe.test" } });
    mocks.user.mockResolvedValue({ id: "u-1", role: "user" });
    mocks.find.mockResolvedValueOnce({ ...record, postId: null, replyId: null });
    mocks.remove.mockResolvedValueOnce({ count: 1 });
    expect((await DELETE(input, context)).status).toBe(200);
    expect(mocks.mark).toHaveBeenCalledWith({ where: { id: "a-1", authorId: "u-1", postId: null, replyId: null }, data: { discardedAt: expect.any(Date) } });
    expect(mocks.remove).toHaveBeenCalledWith({ where: { id: "a-1", authorId: "u-1", postId: null, replyId: null, discardedAt: expect.any(Date) } });
    expect(mocks.deleteStored).toHaveBeenCalledWith(record.filePath);
    mocks.find.mockResolvedValueOnce({ ...record, postId: "post-1", replyId: null });
    expect((await DELETE(input, context)).status).toBe(409);
    expect(mocks.remove).toHaveBeenCalledTimes(1);
  });

  it("does not let another member or a concurrent post delete the upload", async () => {
    const input = new Request("https://enhe.test/api/forum/media/a-1", { method: "DELETE", headers: { origin: "https://enhe.test" } });
    mocks.user.mockResolvedValue({ id: "u-2", role: "user" });
    expect((await DELETE(input, context)).status).toBe(404);
    mocks.user.mockResolvedValue({ id: "u-1", role: "user" });
    mocks.find.mockResolvedValueOnce({ ...record, postId: null, replyId: null });
    mocks.mark.mockResolvedValueOnce({ count: 0 });
    expect((await DELETE(input, context)).status).toBe(409);
    expect(mocks.deleteStored).not.toHaveBeenCalled();
  });

  it.each(["throws", "declines"])("retains a discarded draft record when owner file removal %s", async (failure) => {
    const input = new Request("https://enhe.test/api/forum/media/a-1", { method: "DELETE", headers: { origin: "https://enhe.test" } });
    mocks.user.mockResolvedValue({ id: "u-1", role: "user" });
    mocks.find.mockResolvedValueOnce({ ...record, postId: null, replyId: null });
    if (failure === "throws") mocks.deleteStored.mockRejectedValueOnce(new Error("storage unavailable"));
    else mocks.deleteStored.mockResolvedValueOnce(false);
    expect((await DELETE(input, context)).status).toBeGreaterThanOrEqual(500);
    expect(mocks.mark).toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
