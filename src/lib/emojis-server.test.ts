import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultEmojis, emojiCatalogKey } from "./emojis";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn(), audit: vi.fn(), transaction: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: mocks.revalidateTag }));
vi.mock("@/lib/db", () => ({ prisma: { siteSetting: { findUnique: mocks.findUnique }, $transaction: mocks.transaction } }));
vi.mock("@/lib/admin-audit", () => ({ getAdminAuditRequestContext: async () => ({}), createAdminAuditCreateData: (data: unknown) => data }));
import { getAdminEmojiCatalog, getPublicEmojiCatalog, saveEmojiCatalog } from "./emojis-server";

describe("emoji catalog persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("DATABASE_URL", "postgresql://fixture");
    mocks.transaction.mockImplementation(async (callback) => callback({ siteSetting: { findUnique: mocks.findUnique, updateMany: mocks.updateMany, create: mocks.create }, adminAuditLog: { create: mocks.audit } }));
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ updatedAt: new Date("2026-10-14T00:00:01.000Z") });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("works without a database using the bundled catalog", async () => {
    vi.stubEnv("DATABASE_URL", "");
    expect(await getPublicEmojiCatalog()).toEqual(defaultEmojis);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    await expect(saveEmojiCatalog(defaultEmojis, "", "admin-1", "update")).rejects.toThrow("没有连接数据库");
  });

  it("returns archived mappings and a revision for administrators", async () => {
    const updatedAt = new Date("2026-10-14T00:00:00.000Z");
    const entries = defaultEmojis.map((entry, index) => ({ ...entry, enabled: index !== 0 }));
    mocks.findUnique.mockResolvedValue({ value: JSON.stringify(entries), updatedAt });
    expect(await getAdminEmojiCatalog()).toEqual({ entries, revision: updatedAt.toISOString() });
    expect((await getPublicEmojiCatalog())[0].enabled).toBe(false);
  });

  it("rejects a stale revision before any catalog/audit write", async () => {
    mocks.findUnique.mockResolvedValue({ id: "setting-1", value: "[]", updatedAt: new Date() });
    await expect(saveEmojiCatalog(defaultEmojis, "stale", "admin-1", "update")).rejects.toThrow("刷新");
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("writes the catalog and the audit in the same transaction and invalidates bounded caches", async () => {
    expect(await saveEmojiCatalog(defaultEmojis, "", "admin-1", "update")).toEqual({ entries: defaultEmojis, revision: "2026-10-14T00:00:01.000Z" });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ key: emojiCatalogKey, value: JSON.stringify(defaultEmojis) }) });
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ adminId: "admin-1", action: "emoji.update", targetType: "emoji" }) });
    expect(mocks.revalidateTag).toHaveBeenCalledWith("managed-emojis");
    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
  });

  it("does not turn a committed save into an upload failure when cache invalidation fails", async () => {
    mocks.revalidateTag.mockImplementationOnce(() => { throw new Error("cache-context-unavailable"); });
    await expect(saveEmojiCatalog(defaultEmojis, "", "admin-1", "add", "enhe_01"))
      .resolves.toMatchObject({ revision: "2026-10-14T00:00:01.000Z" });
  });
});
