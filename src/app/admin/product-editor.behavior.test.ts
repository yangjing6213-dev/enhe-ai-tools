import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const record = () => ({ findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() });
  return { admin: vi.fn(), audit: vi.fn(), storage: vi.fn(), db: { tool: record(), user: record(), file: record(), toolPriceSpec: record(), tutorial: record(), toolFaq: record(), toolChangelog: record(), toolTag: { ...record(), upsert: vi.fn() }, toolTagLink: record(), $transaction: vi.fn() } };
});
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.admin, hashPassword: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: mocks.db }));
vi.mock("@/lib/admin-audit", () => ({ writeAdminAuditLog: mocks.audit, getAdminAuditRequestContext: vi.fn() }));
vi.mock("@/lib/storage", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/storage")>(), saveUploadedFile: mocks.storage }));
vi.mock("@/lib/indexnow", () => ({ notifyIndexNow: vi.fn() }));
vi.mock("@/lib/baidu-push", () => ({ notifyBaiduSearch: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));

import { upsertToolAction, upsertTutorialAction, upsertToolFaqAction, upsertToolChangelogAction, updateToolTagsAction } from "@/app/admin/actions";

const copy = "  Hello 👩🏽‍💻\n\n  First line ✅\n    Second line 👍🏽\n\n\nFamily 👨‍👩‍👧‍👦  ";
const form = (values: Record<string, string>) => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.admin.mockResolvedValue({ id: "local-admin" });
  mocks.db.$transaction.mockImplementation(async operation => typeof operation === "function" ? operation(mocks.db) : Promise.all(operation));
  mocks.db.tool.update.mockResolvedValue({ id: "local-tool", type: "software", slug: "local-product", name: "Local product" });
  mocks.db.tool.findUnique.mockResolvedValue(null);
  mocks.db.tool.create.mockResolvedValue({ id: "new-tool", type: "software", slug: "new-product", name: "New product" });
  mocks.db.user.update.mockResolvedValue({ id: "local-admin" });
  mocks.db.file.findUnique.mockResolvedValue({ id: "local-file", toolId: "local-tool", filePath: "old", fileUrl: "old" });
  mocks.db.file.update.mockResolvedValue({ id: "local-file" });
  mocks.db.toolPriceSpec.updateMany.mockResolvedValue({ count: 0 });
  for (const model of [mocks.db.tutorial, mocks.db.toolFaq, mocks.db.toolChangelog]) model.update.mockResolvedValue({ id: "local-record" });
  mocks.storage.mockImplementation(async (file: File) => ({ storage: "local", fileUrl: `/uploads/${file.name}`, filePath: `/tmp/${file.name}`, fileName: file.name, fileSize: file.size, mimeType: file.type }));
});

describe("product editor isolated save path", () => {
  it("saves authored copy, media, download text, image order and emoji through the actual action", async () => {
    const data = form({ id: "local-tool", type: "software", name: "Local ✅", slug: "local-product", shortDescription: copy, content: copy, downloadFileId: "local-file", downloadFileUrl: copy, videoUrl: "/uploads/demo.mp4", videoDescription: copy, version: "v1", systemRequirement: "Windows\nmacOS", status: "draft" });
    data.append("existingScreenshots", "/uploads/second.png");
    data.append("existingScreenshots", "/uploads/first.png");
    data.set("coverImageFile", new File(["image"], "cover.png", { type: "image/png" }));
    data.append("screenshotFiles", new File(["image"], "third.png", { type: "image/png" }));
    await expect(upsertToolAction(data)).rejects.toThrow("?saved=1");
    const saved = mocks.db.tool.update.mock.calls[0][0].data;
    expect(saved).toMatchObject({ shortDescription: copy, content: copy, videoDescription: copy, videoUrl: "/uploads/demo.mp4", coverImage: "/uploads/cover.png", screenshots: ["/uploads/second.png", "/uploads/first.png", "/uploads/third.png"] });
    expect(mocks.db.file.update.mock.calls[0][0].data.fileUrl).toBe(copy);
    expect(mocks.audit).toHaveBeenCalled();
  });
  it("clears a software download binding when its edited content is emptied", async () => {
    const data = form({ id: "local-tool", type: "software", name: "Local", slug: "local-product", shortDescription: "Summary", content: "Detail", downloadFileId: "local-file", downloadFileUrl: "", status: "draft" });
    await expect(upsertToolAction(data)).rejects.toThrow("?saved=1");
    expect(mocks.db.tool.update.mock.calls[0][0].data.downloadFileId).toBeNull();
    expect(mocks.db.file.update).not.toHaveBeenCalled();
  });
  it.each(["software", "ai_skill"])("defaults a new %s product to the logged-in creator and records a manual review date", async (type) => {
    const data = form({
      type,
      name: "New product",
      slug: "new-product",
      shortDescription: "Summary",
      content: "Detail",
      status: "draft",
      creatorId: "local-admin",
      creatorBio: "A creator bio",
      securityReviewed: "on",
    });

    await expect(upsertToolAction(data)).rejects.toThrow("?saved=1");

    expect(mocks.db.tool.create.mock.calls[0][0].data).toMatchObject({ creatorId: "local-admin" });
    expect(mocks.db.tool.create.mock.calls[0][0].data.securityReviewedAt).toBeInstanceOf(Date);
    expect(mocks.db.user.update).toHaveBeenCalledWith({
      where: { id: "local-admin" },
      data: { creatorBio: "A creator bio" },
    });
  });
  it("requires admin authorization before saving product data", async () => {
    mocks.admin.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(upsertToolAction(form({ type: "software" }))).rejects.toThrow("FORBIDDEN");
    expect(mocks.db.tool.update).not.toHaveBeenCalled();
  });
  it.each([true, false])("preserves the original AI Skill review date only while review is selected (%s)", async (reviewed) => {
    const reviewedAt = new Date("2026-10-20T08:00:00Z");
    mocks.db.tool.findUnique.mockResolvedValue({ creatorId: "local-admin", securityReviewedAt: reviewedAt });
    const data = form({ id: "local-tool", type: "ai_skill", name: "Skill", slug: "skill", shortDescription: "Summary", content: "Detail", status: "draft" });
    if (reviewed) data.set("securityReviewed", "on");
    await expect(upsertToolAction(data)).rejects.toThrow("?saved=1");
    expect(mocks.db.tool.update.mock.calls[0][0].data).toMatchObject({
      creatorId: "local-admin",
      securityReviewedAt: reviewed ? reviewedAt : null,
    });
  });
  it("stores ordered how-to steps and the prompt without including prompt text in the audit event", async () => {
    const privatePrompt = "private prompt text that must not enter audit metadata";
    const data = form({
      id: "local-tool", type: "software", name: "Local product", slug: "local-product",
      shortDescription: "A short description", content: "Product details", status: "draft",
      downloadFileId: "existing-file", deliveryMode: "how_to", usageStepCount: "2",
      usageStepTitle_0: "Connect", usageStepDescription_0: "Open the supported app.",
      usageStepTitle_1: "Finish setup", usageStepDescription_1: "Paste the copied prompt.",
      installPrompt: privatePrompt,
    });

    await expect(upsertToolAction(data)).rejects.toThrow("?saved=1");

    expect(mocks.db.tool.update.mock.calls[0][0].data).toMatchObject({
      deliveryMode: "how_to",
      usageSteps: [
        { title: "Connect", description: "Open the supported app." },
        { title: "Finish setup", description: "Paste the copied prompt." },
      ],
      installPrompt: privatePrompt,
      downloadFileId: "existing-file",
    });
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain(privatePrompt);
  });

  it("rejects a how-to form with more than five steps before saving", async () => {
    const data = form({
      type: "software", name: "Local product", shortDescription: "Summary", content: "Details", status: "draft",
      deliveryMode: "how_to", usageStepCount: "6", installPrompt: "prompt",
    });

    await expect(upsertToolAction(data)).rejects.toThrow("REDIRECT:/admin/software?error=");
    expect(mocks.db.tool.create).not.toHaveBeenCalled();
    expect(mocks.db.tool.update).not.toHaveBeenCalled();
  });
  it("saves tutorial, FAQ and changelog text and media fields without flattening emoji or lines", async () => {
    const values = { id: "local-record", toolId: "local-tool", title: "Title ✅", content: copy, imageUrl: "/uploads/tutorial.png", videoUrl: "/uploads/tutorial.mp4", notes: copy, commonErrors: copy, question: "Question ✅", answer: copy, versionMajor: "2", versionMinor: "0", status: "active" };
    await expect(upsertTutorialAction(form(values))).rejects.toThrow("?saved=1");
    expect(mocks.db.tutorial.update.mock.calls[0][0].data).toMatchObject({ content: copy, notes: copy, commonErrors: copy, imageUrl: values.imageUrl, videoUrl: values.videoUrl });
    await expect(upsertToolFaqAction(form(values))).rejects.toThrow("?saved=1");
    expect(mocks.db.toolFaq.update.mock.calls[0][0].data.answer).toBe(copy);
    await expect(upsertToolChangelogAction(form(values))).rejects.toThrow("?saved=1");
    expect(mocks.db.toolChangelog.update.mock.calls[0][0].data).toMatchObject({ content: copy, version: "V2.0" });
  });
  it("deduplicates and binds emoji tags without losing their text", async () => {
    mocks.db.toolTag.upsert.mockImplementation(async ({ create }) => ({ id: create.name, ...create }));
    await updateToolTagsAction(form({ toolId: "local-tool", tags: "Video ✅,Agent 🚀,Video ✅" }));
    expect(mocks.db.toolTag.upsert.mock.calls.map(call => call[0].create.name)).toEqual(["Video ✅", "Agent 🚀"]);
    expect(mocks.db.toolTagLink.create).toHaveBeenCalledTimes(2);
  });
});
