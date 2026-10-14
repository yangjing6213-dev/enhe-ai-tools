import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emojiImageSource, parseEmojiCatalog, type EmojiEntry } from "./emojis";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), catalog: vi.fn(), publicCatalog: vi.fn(), saveCatalog: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.admin }));
vi.mock("@/lib/emojis-server", () => ({ getAdminEmojiCatalog: mocks.catalog, getPublicEmojiCatalog: mocks.publicCatalog, saveEmojiCatalog: mocks.saveCatalog }));
import { POST } from "@/app/api/admin/emojis/route";
import { GET } from "@/app/api/emojis/[id]/route";

let uploadDir = "";
let catalogJson = "";

async function uploadRequest() {
  const png = await sharp({ create: { width: 40, height: 32, channels: 4, background: "#0af" } }).png().toBuffer();
  const form = new FormData();
  form.set("file", new File([new Uint8Array(png)], "original.png", { type: "image/png" }));
  form.set("label", "真实本地素材");
  form.set("revision", "test-revision");
  return new Request("https://example.test/api/admin/emojis", { method: "POST", headers: { origin: "https://example.test" }, body: form });
}

describe("actual local emoji storage integration", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    uploadDir = await mkdtemp(join(tmpdir(), "enhe-emojis-"));
    catalogJson = "";
    vi.stubEnv("UPLOAD_DIR", uploadDir);
    vi.stubEnv("DATABASE_URL", "postgresql://fixture");
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "");
    for (const name of ["TENCENT_COS_SECRET_ID", "TENCENT_COS_SECRET_KEY", "TENCENT_COS_BUCKET", "TENCENT_COS_REGION"]) vi.stubEnv(name, "");
    mocks.admin.mockResolvedValue({ id: "admin-1", role: "admin" });
    mocks.catalog.mockImplementation(async () => ({ entries: parseEmojiCatalog(catalogJson), revision: "test-revision" }));
    mocks.publicCatalog.mockImplementation(async () => parseEmojiCatalog(catalogJson));
    mocks.saveCatalog.mockImplementation(async (entries: EmojiEntry[]) => {
      catalogJson = JSON.stringify(entries);
      return { entries: parseEmojiCatalog(catalogJson), revision: "test-revision" };
    });
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    const absolute = resolve(uploadDir);
    if (dirname(absolute) !== resolve(tmpdir()) || !basename(absolute).startsWith("enhe-emojis-")) throw new Error("Unexpected temporary upload directory");
    await rm(absolute, { recursive: true, force: true });
  });

  it("keeps the real flattened upload URL in the catalog and reads it via the image API", async () => {
    const added = await POST(await uploadRequest());
    expect(added.status).toBe(201);
    const catalog = await added.json() as { entries: EmojiEntry[] };
    expect(catalog.entries).toHaveLength(27);
    const entry = catalog.entries.find((item) => item.label === "真实本地素材")!;
    expect(entry.url).toMatch(/^\/uploads\/\d+-emojis-\d+-enhe-[a-f0-9]{32}\.webp$/);
    expect(emojiImageSource(entry)).toBe(`/api/emojis/${entry.id}`);
    expect(await readdir(uploadDir)).toHaveLength(1);
    const response = await GET(new Request(`https://example.test/api/emojis/${entry.id}`), { params: Promise.resolve({ id: entry.id }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    const image = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    expect(image.format).toBe("webp");
    expect(image.width).toBe(40);
    expect(image.height).toBe(32);
  });

  it("unlinks the actual new flattened file when catalog persistence fails", async () => {
    mocks.saveCatalog.mockRejectedValue(new Error("catalog-write-failed"));
    const response = await POST(await uploadRequest());
    expect(response.status).toBe(400);
    expect(await readdir(uploadDir)).toEqual([]);
    expect(parseEmojiCatalog(catalogJson)).toHaveLength(26);
  });
});
