import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultEmojis } from "./emojis";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getAdminEmojiCatalog: vi.fn(), saveEmojiCatalog: vi.fn(), saveUploadedFile: vi.fn(), deleteLocal: vi.fn(), deleteCos: vi.fn(), parseCos: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/emojis-server", () => ({ getAdminEmojiCatalog: mocks.getAdminEmojiCatalog, saveEmojiCatalog: mocks.saveEmojiCatalog }));
vi.mock("@/lib/storage", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/storage")>(),
  saveUploadedFile: mocks.saveUploadedFile, deleteStoredLocalFileIfSafe: mocks.deleteLocal,
  deleteStoredCosObjectIfConfigured: mocks.deleteCos, parseCosFilePath: mocks.parseCos
}));
import { createStorageObjectKey } from "@/lib/storage";
import { buildPublicUploadUrl } from "@/lib/admin-form";
import { getUploadDiskPath } from "@/lib/upload-path";
import { GET, POST, PUT } from "@/app/api/admin/emojis/route";

const edits = () => defaultEmojis.map(({ id, label, enabled, order }) => ({ id, label, enabled, order }));
const request = (body: unknown, origin: string | null = "https://example.test") => new Request("https://example.test/api/admin/emojis", { method: "PUT", body: JSON.stringify(body), headers: origin ? { origin } : {} });

describe("admin emoji API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", role: "admin" });
    mocks.getAdminEmojiCatalog.mockResolvedValue({ entries: defaultEmojis, revision: "version-1" });
    mocks.saveEmojiCatalog.mockResolvedValue({ entries: defaultEmojis, revision: "version-2" });
    mocks.deleteLocal.mockResolvedValue(true);
    mocks.deleteCos.mockResolvedValue({ deleted: true });
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each(["local", "cos"])("cleans only the newly generated %s asset when catalog persistence fails", async (storage) => {
    vi.stubEnv("DATABASE_URL", "postgresql://fixture");
    vi.stubEnv("TENCENT_COS_BUCKET", "test-bucket");
    vi.stubEnv("UPLOAD_DIR", "C:/fixture/public/uploads");
    const png = await sharp({ create: { width: 32, height: 32, channels: 4, background: "#00aaff" } }).png().toBuffer();
    const form = new FormData();
    form.set("file", new File([new Uint8Array(png)], "source.png", { type: "image/png" }));
    form.set("label", "新素材");
    form.set("revision", "version-1");
    let createdPath = "";
    mocks.saveUploadedFile.mockImplementation(async (file: File) => {
      const objectKey = createStorageObjectKey("emojis", file.name, () => "123");
      const fileUrl = storage === "cos" ? `https://test-bucket.cos.ap-test.myqcloud.com/${objectKey}` : buildPublicUploadUrl(objectKey, 124);
      createdPath = storage === "cos" ? `cos://test-bucket/${objectKey}` : getUploadDiskPath(fileUrl);
      mocks.parseCos.mockReturnValue(storage === "cos" ? { bucket: "test-bucket", key: objectKey } : null);
      return { fileName: file.name, filePath: createdPath, fileUrl, objectKey, storage };
    });
    mocks.saveEmojiCatalog.mockRejectedValue(new Error("catalog-write-failed"));
    const response = await POST(new Request("https://example.test/api/admin/emojis", { method: "POST", headers: { origin: "https://example.test" }, body: form }));
    expect(response.status).toBe(400);
    expect(storage === "cos" ? mocks.deleteCos : mocks.deleteLocal).toHaveBeenCalledWith(createdPath);
    expect(storage === "cos" ? mocks.deleteLocal : mocks.deleteCos).not.toHaveBeenCalled();
  });

  it("adds a re-encoded admin asset with a new immutable id and audit actor", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://fixture");
    const png = await sharp({ create: { width: 32, height: 32, channels: 4, background: "#00aaff" } }).png().toBuffer();
    const form = new FormData();
    form.set("file", new File([new Uint8Array(png)], "source.png", { type: "image/png" }));
    form.set("label", "新素材");
    form.set("revision", "version-1");
    mocks.saveUploadedFile.mockResolvedValue({ fileUrl: "/uploads/emojis/123-new.webp" });
    mocks.saveEmojiCatalog.mockImplementation(async (entries) => ({ entries, revision: "version-2" }));
    const response = await POST(new Request("https://example.test/api/admin/emojis", { method: "POST", headers: { origin: "https://example.test" }, body: form }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.entries).toHaveLength(27);
    expect(body.entries[26]).toMatchObject({ id: expect.stringMatching(/^enhe_[a-f0-9]{32}$/), label: "新素材", enabled: true });
    expect(mocks.saveUploadedFile).toHaveBeenCalledWith(expect.objectContaining({ type: "image/webp" }), expect.objectContaining({ folder: "emojis" }));
    expect(mocks.saveEmojiCatalog).toHaveBeenCalledWith(expect.any(Array), "version-1", "admin-1", "add", body.entries[26].id);
  });

  it("requires administrator authorization before every read, edit or upload", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", role: "user" });
    expect((await GET()).status).toBe(403);
    expect((await PUT(request({}))).status).toBe(403);
    expect((await POST(new Request("https://example.test/api/admin/emojis", { method: "POST" }))).status).toBe(403);
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(mocks.getAdminEmojiCatalog).not.toHaveBeenCalled();
    expect(mocks.saveUploadedFile).not.toHaveBeenCalled();
  });

  it("rejects missing or foreign origins before mutations", async () => {
    for (const origin of [null, "null", "https://evil.test"]) {
      expect((await PUT(request({ entries: edits(), revision: "version-1" }, origin))).status).toBe(403);
      expect((await POST(new Request("https://example.test/api/admin/emojis", { method: "POST", headers: origin ? { origin } : {} }))).status).toBe(403);
    }
    expect(mocks.saveEmojiCatalog).not.toHaveBeenCalled();
    expect(mocks.saveUploadedFile).not.toHaveBeenCalled();
  });

  it.each([
    { config: "NEXT_PUBLIC_APP_URL", site: "http://127.0.0.1:3111", internal: "http://localhost:3111" },
    { config: "APP_URL", site: "https://enhe.example.test", internal: "http://localhost:3000" }
  ])("accepts trusted $config when the proxy uses an internal request origin", async ({ config, site, internal }) => {
    vi.stubEnv(config, site);
    const response = await PUT(new Request(`${internal}/api/admin/emojis`, { method: "PUT", headers: { origin: site }, body: JSON.stringify({ entries: edits(), revision: "version-1" }) }));
    expect(response.status).toBe(200);
  });

  it("does not trust caller-supplied Host or forwarding headers as allowed origins", async () => {
    vi.stubEnv("APP_URL", "https://enhe.example.test");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://enhe.example.test");
    const response = await PUT(new Request("http://localhost:3000/api/admin/emojis", { method: "PUT", headers: { origin: "https://evil.test", host: "evil.test", "x-forwarded-host": "evil.test", "x-forwarded-proto": "https" }, body: JSON.stringify({ entries: edits(), revision: "version-1" }) }));
    expect(response.status).toBe(403);
    expect(mocks.saveEmojiCatalog).not.toHaveBeenCalled();
  });

  it("preserves image identities and records the acting admin during edits", async () => {
    const next = edits();
    next[0] = { ...next[0], label: "开心", enabled: false };
    const response = await PUT(request({ entries: next.map((entry) => ({ ...entry, url: "https://evil.test/evil.svg" })), revision: "version-1" }));
    expect(response.status).toBe(200);
    expect(mocks.saveEmojiCatalog).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: "enhe_01", label: "开心", enabled: false, url: defaultEmojis[0].url })]), "version-1", "admin-1", "update");
  });

  it("rejects hard deletion and malformed edits before persistence", async () => {
    expect((await PUT(request({ entries: edits().slice(1), revision: "version-1" }))).status).toBe(400);
    expect((await PUT(request({ entries: edits(), revision: 123 }))).status).toBe(400);
    expect(mocks.saveEmojiCatalog).not.toHaveBeenCalled();
  });

  it("does not expose database or storage error details to the browser", async () => {
    mocks.saveEmojiCatalog.mockRejectedValue(new Error("postgres://sensitive-connection-details"));
    const response = await PUT(request({ entries: edits(), revision: "version-1" }));
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).not.toContain("sensitive");
  });

  it("rejects oversized requests before parsing or writing an asset", async () => {
    const response = await POST(new Request("https://example.test/api/admin/emojis", { method: "POST", headers: { origin: "https://example.test", "content-length": String(5 * 1024 * 1024) }, body: "too large" }));
    expect(response.status).toBe(413);
    expect(mocks.saveUploadedFile).not.toHaveBeenCalled();
  });

  it("rejects oversized actual bodies without content-length before parsing", async () => {
    expect((await PUT(request("a".repeat(128 * 1024 + 1)))).status).toBe(413);
    const response = await POST(new Request("https://example.test/api/admin/emojis", { method: "POST", headers: { origin: "https://example.test" }, body: "a".repeat(5 * 1024 * 1024) }));
    expect(response.status).toBe(413);
    expect(mocks.saveUploadedFile).not.toHaveBeenCalled();
  });
});
