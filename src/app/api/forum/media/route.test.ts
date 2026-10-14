import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), count: vi.fn(), create: vi.fn(), save: vi.fn(), deleteStored: vi.fn(), findExpired: vi.fn(), removeExpired: vi.fn(), markExpired: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/db", () => ({ prisma: { forumAttachment: { count: mocks.count, create: mocks.create, findMany: mocks.findExpired, deleteMany: mocks.removeExpired, updateMany: mocks.markExpired } } }));
vi.mock("@/lib/storage", () => ({ saveUploadedFile: mocks.save }));
vi.mock("@/lib/forum-media-storage", () => ({ deleteForumMediaStoredFile: mocks.deleteStored }));
import { POST } from "./route";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAE0lEQVQImWP4z8DwnwGM/zMwAAAf7gP9qS/A4gAAAABJRU5ErkJggg==", "base64");
function request(file = new File([png], "test.png", { type: "image/png" }), surface = "reply", origin = "https://enhe.test") {
  const body = new FormData(); body.set("file", file); body.set("surface", surface);
  return new Request("https://enhe.test/api/forum/media", { method: "POST", headers: { origin }, body });
}
describe("forum media uploads", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "u-1", role: "user" });
    mocks.count.mockResolvedValue(0);
    mocks.save.mockResolvedValue({ filePath: "cos://private-bucket/forum-media/test.webp", fileSize: 123, mimeType: "image/webp", fileUrl: "https://must-not-leak.test" });
    mocks.create.mockResolvedValue({ id: "attachment-1" });
    mocks.deleteStored.mockResolvedValue(true);
    mocks.findExpired.mockResolvedValue([]);
    mocks.removeExpired.mockResolvedValue({ count: 1 });
    mocks.markExpired.mockResolvedValue({ count: 1 });
  });
  it("requires authentication and blocks requests from other websites", async () => {
    mocks.user.mockResolvedValueOnce(null);
    expect((await POST(request())).status).toBe(401);
    expect((await POST(request(undefined, "post", "https://other.test"))).status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("stores normalized media privately and returns only the authorized site URL", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "attachment-1", type: "image", url: "/api/forum/media/attachment-1", mimeType: "image/webp" });
    expect(mocks.save).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({ access: "private", folder: "forum-media" }));
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ authorId: "u-1", kind: "image", mimeType: "image/webp" }) });
  });
  it("rejects forged files and unsupported reply videos", async () => {
    expect((await POST(request(new File(["script"], "test.png", { type: "image/png" })))).status).toBe(415);
    expect((await POST(request(new File(["video"], "test.mp4", { type: "video/mp4" })))).status).toBe(415);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("bounds recent uploads and unused upload storage", async () => {
    mocks.count.mockResolvedValueOnce(40);
    expect((await POST(request())).status).toBe(429);
    mocks.count.mockResolvedValueOnce(0).mockResolvedValueOnce(50);
    expect((await POST(request())).status).toBe(429);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("hides storage failure details", async () => {
    mocks.save.mockRejectedValueOnce(new Error("cos://secret-bucket/private-path signature=private"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secret-bucket");
  });

  it("rejects oversized request bodies before parsing them", async () => {
    const input = new Request("https://enhe.test/api/forum/media", { method: "POST", headers: { origin: "https://enhe.test", "content-length": String(102 * 1024 * 1024), "content-type": "multipart/form-data; boundary=test" }, body: "small" });
    expect((await POST(input)).status).toBe(413);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("cleans the stored file if its attachment record cannot be saved", async () => {
    mocks.create.mockRejectedValueOnce(new Error("database unavailable"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(mocks.deleteStored).toHaveBeenCalledWith("cos://private-bucket/forum-media/test.webp");
  });

  it("marks expired unused drafts before deleting storage and counting all unused uploads", async () => {
    const events: string[] = [];
    let unused = 50;
    mocks.findExpired.mockResolvedValue([{ id: "old-1", filePath: "cos://private-bucket/forum-media/old.webp" }]);
    mocks.markExpired.mockImplementation(async () => { events.push("mark"); return { count: 1 }; });
    mocks.deleteStored.mockImplementation(async () => { events.push("storage"); return true; });
    mocks.removeExpired.mockImplementation(async () => { events.push("record"); unused -= 1; return { count: 1 }; });
    mocks.count.mockImplementation(async ({ where }) => where.createdAt ? 0 : unused);
    expect((await POST(request())).status).toBe(201);
    expect(events).toEqual(["mark", "storage", "record"]);
    expect(mocks.findExpired).toHaveBeenCalledWith(expect.objectContaining({ where: { authorId: "u-1", postId: null, replyId: null, createdAt: { lt: expect.any(Date) } }, take: 50 }));
    expect(mocks.markExpired).toHaveBeenCalledWith({ where: { id: "old-1", authorId: "u-1", postId: null, replyId: null, createdAt: { lt: expect.any(Date) } }, data: { discardedAt: expect.any(Date) } });
    expect(mocks.removeExpired).toHaveBeenCalledWith({ where: { id: "old-1", authorId: "u-1", postId: null, replyId: null, createdAt: { lt: expect.any(Date) }, discardedAt: expect.any(Date) } });
    expect(mocks.count).toHaveBeenCalledWith({ where: { authorId: "u-1", postId: null, replyId: null } });
  });

  it.each(["throws", "declines"])("retains expired upload records and quota when safe storage cleanup %s", async (failure) => {
    mocks.findExpired.mockResolvedValue([{ id: "old-1", filePath: "cos://private-bucket/forum-media/old.webp" }]);
    if (failure === "throws") mocks.deleteStored.mockRejectedValue(new Error("storage unavailable"));
    else mocks.deleteStored.mockResolvedValue(false);
    mocks.count.mockImplementation(async ({ where }) => where.createdAt ? 0 : 50);
    expect((await POST(request())).status).toBe(429);
    expect(mocks.removeExpired).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.count).toHaveBeenCalledWith({ where: { authorId: "u-1", postId: null, replyId: null } });
    expect(mocks.markExpired).toHaveBeenCalled();
  });

  it("does not delete a file when a concurrent submission wins the attachment row", async () => {
    mocks.findExpired.mockResolvedValue([{ id: "old-1", filePath: "cos://private-bucket/forum-media/old.webp" }]);
    mocks.markExpired.mockResolvedValueOnce({ count: 0 });
    expect((await POST(request())).status).toBe(201);
    expect(mocks.deleteStored).not.toHaveBeenCalled();
    expect(mocks.removeExpired).not.toHaveBeenCalled();
  });

  it("retains quota and storage when marking disposal ownership fails", async () => {
    mocks.findExpired.mockResolvedValue([{ id: "old-1", filePath: "cos://private-bucket/forum-media/old.webp" }]);
    mocks.markExpired.mockRejectedValueOnce(new Error("database write failed"));
    mocks.count.mockImplementation(async ({ where }) => where.createdAt ? 0 : 50);
    expect((await POST(request())).status).toBe(429);
    expect(mocks.deleteStored).not.toHaveBeenCalled();
    expect(mocks.removeExpired).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("retries storage cleanup of previously discarded drafts", async () => {
    mocks.findExpired.mockResolvedValue([{ id: "old-1", filePath: "cos://private-bucket/forum-media/old.webp", discardedAt: new Date(0) }]);
    expect((await POST(request())).status).toBe(201);
    expect(mocks.markExpired).toHaveBeenCalled();
    expect(mocks.deleteStored).toHaveBeenCalledWith("cos://private-bucket/forum-media/old.webp");
    expect(mocks.removeExpired).toHaveBeenCalled();
    expect(mocks.findExpired.mock.calls[0][0].where).not.toHaveProperty("discardedAt");
  });
});
