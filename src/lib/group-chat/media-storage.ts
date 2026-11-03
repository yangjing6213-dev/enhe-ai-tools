import { unlink } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { deleteStoredCosObjectIfConfigured, getSecureCosMediaUrl, parseCosFilePath, resolvePrivateLocalUploadPath } from "@/lib/storage";

function isSafeChatMediaKey(key: string) {
  return key.startsWith("chat-media/") && !key.split("/").some((part) => part === "." || part === ".." || part.includes("\\"));
}

export async function deleteChatMediaStoredFile(filePath: string) {
  const cos = parseCosFilePath(filePath);
  if (cos) {
    if (!isSafeChatMediaKey(cos.key)) return false;
    return (await deleteStoredCosObjectIfConfigured(filePath)).deleted;
  }
  const local = resolvePrivateLocalUploadPath(filePath);
  const mediaRoot = resolve(process.cwd(), process.env.PRIVATE_UPLOAD_DIR ?? "private-uploads", "chat-media");
  if (!local?.startsWith(`${mediaRoot}${sep}`)) return false;
  try { await unlink(local); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  return true;
}

export async function readChatMediaUrl(filePath: string) {
  const cos = parseCosFilePath(filePath);
  if (cos) return isSafeChatMediaKey(cos.key) ? getSecureCosMediaUrl(filePath) : null;
  const local = resolvePrivateLocalUploadPath(filePath);
  const mediaRoot = resolve(process.cwd(), process.env.PRIVATE_UPLOAD_DIR ?? "private-uploads", "chat-media");
  return local?.startsWith(`${mediaRoot}${sep}`) ? local : null;
}
