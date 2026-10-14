import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { EmojiCatalogError, maxEmojiEntries, maxEmojiUploadBytes, validateEmojiEdits } from "@/lib/emojis";
import { getAdminEmojiCatalog, saveEmojiCatalog } from "@/lib/emojis-server";
import { EmojiRequestTooLargeError, prepareEmojiUpload, readBoundedEmojiRequest } from "@/lib/emojis-upload";
import { createStorageObjectKey, deleteStoredCosObjectIfConfigured, deleteStoredLocalFileIfSafe, parseCosFilePath, saveUploadedFile, type StoredUpload } from "@/lib/storage";
import { buildPublicUploadUrl } from "@/lib/admin-form";
import { getUploadDiskPath } from "@/lib/upload-path";

async function removeNewUpload(stored: StoredUpload, id: string) {
  const timestamp = /^emojis\/([0-9]+)-/.exec(stored.objectKey)?.[1];
  if (stored.fileName !== `${id}.webp` || !timestamp || createStorageObjectKey("emojis", `${id}.webp`, () => timestamp) !== stored.objectKey) return;
  if (stored.storage === "cos") {
    const cos = parseCosFilePath(stored.filePath);
    if (cos?.bucket !== process.env.TENCENT_COS_BUCKET?.trim() || cos?.key !== stored.objectKey) return;
    await deleteStoredCosObjectIfConfigured(stored.filePath);
  } else {
    const publicTimestamp = /^\/uploads\/([0-9]+)-/.exec(stored.fileUrl)?.[1];
    if (!publicTimestamp || !Number.isSafeInteger(Number(publicTimestamp))) return;
    const expectedUrl = buildPublicUploadUrl(stored.objectKey, Number(publicTimestamp));
    if (stored.fileUrl !== expectedUrl || resolve(stored.filePath) !== resolve(getUploadDiskPath(expectedUrl))) return;
    await deleteStoredLocalFileIfSafe(stored.filePath);
  }
}

async function authorizeAdmin() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录管理员账号。" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "只有管理员可以管理表情素材。" }, { status: 403 });
  return user;
}

function hasSameOrigin(request: Request) {
  const origins = new Set([new URL(request.url).origin]);
  for (const value of [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    try {
      if (value) {
        const site = new URL(value);
        if (["http:", "https:"].includes(site.protocol)) origins.add(site.origin);
      }
    } catch {
      // Ignore invalid optional site configuration, never forwarding headers.
    }
  }
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  try { return origins.has(new URL(origin).origin); } catch { return false; }
}

const invalidOrigin = () => NextResponse.json({ message: "请从本网站的表情管理页面提交。" }, { status: 403 });

export async function GET() {
  const admin = await authorizeAdmin();
  if (admin instanceof NextResponse) return admin;
  return NextResponse.json(await getAdminEmojiCatalog(), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const admin = await authorizeAdmin();
  if (admin instanceof NextResponse) return admin;
  if (!hasSameOrigin(request)) return invalidOrigin();
  try {
    const text = await (await readBoundedEmojiRequest(request, 128 * 1024)).text();
    const body = JSON.parse(text) as { entries?: unknown; revision?: unknown };
    if (typeof body.revision !== "string") throw new EmojiCatalogError("请刷新表情目录后重试。");
    const current = await getAdminEmojiCatalog();
    const entries = validateEmojiEdits(body.entries, current.entries);
    return NextResponse.json(await saveEmojiCatalog(entries, body.revision, admin.id, "update"));
  } catch (error) {
    return NextResponse.json({ message: error instanceof EmojiCatalogError ? error.message : "表情设置保存失败，请刷新或稍后重试。" }, { status: error instanceof EmojiRequestTooLargeError ? 413 : 400 });
  }
}

export async function POST(request: Request) {
  const admin = await authorizeAdmin();
  if (admin instanceof NextResponse) return admin;
  if (!hasSameOrigin(request)) return invalidOrigin();
  if (Number(request.headers.get("content-length")) > maxEmojiUploadBytes + 64 * 1024) {
    return NextResponse.json({ message: "表情图片请控制在 4MB 以内。" }, { status: 413 });
  }
  try {
    const form = await (await readBoundedEmojiRequest(request, maxEmojiUploadBytes + 64 * 1024)).formData();
    const file = form.get("file");
    const label = String(form.get("label") ?? "").trim();
    const revision = form.get("revision");
    if (!(file instanceof File) || !label || label.length > 40 || typeof revision !== "string") throw new EmojiCatalogError("请选择图片，并填写 1–40 个字的表情名称。");
    const current = await getAdminEmojiCatalog();
    if (revision !== current.revision) throw new EmojiCatalogError("目录已变化，请刷新后重试。");
    if (current.entries.length >= maxEmojiEntries) throw new EmojiCatalogError(`最多保留 ${maxEmojiEntries} 个表情素材。`);
    if (!process.env.DATABASE_URL?.trim()) throw new EmojiCatalogError("当前没有连接数据库，暂时不能添加表情素材。");
    const id = `enhe_${randomUUID().replaceAll("-", "")}`;
    const prepared = await prepareEmojiUpload(file, id);
    const stored = await saveUploadedFile(prepared, { folder: "emojis", maxBytes: maxEmojiUploadBytes, accept: (image) => image.type === "image/webp" });
    const entries = [...current.entries, { id, label, url: stored.fileUrl, enabled: true, order: current.entries.length }];
    try {
      return NextResponse.json(await saveEmojiCatalog(entries, revision, admin.id, "add", id), { status: 201 });
    } catch (error) {
      // Confirm that a possibly interrupted transaction did not register the
      // image before deleting only this request's generated object.
      try {
        const latest = await getAdminEmojiCatalog();
        if (latest.entries.some((entry) => entry.id === id && entry.url === stored.fileUrl)) {
          return NextResponse.json(latest, { status: 201 });
        }
        await removeNewUpload(stored, id);
      } catch {
        // If registration cannot be checked or cleanup fails, keep the asset.
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ message: error instanceof EmojiCatalogError ? error.message : "表情上传失败，请稍后重试。" }, { status: error instanceof EmojiRequestTooLargeError ? 413 : 400 });
  }
}
