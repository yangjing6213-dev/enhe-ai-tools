import { unlink } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { deleteStoredCosObjectIfConfigured, parseCosFilePath, resolvePrivateLocalUploadPath } from "@/lib/storage";

export async function deleteForumMediaStoredFile(filePath: string) {
  const cos = parseCosFilePath(filePath);
  if (cos) {
    if (!cos.key.startsWith("forum-media/") || cos.key.split("/").some((part) => part === "." || part === ".." || part.includes("\\"))) return false;
    return (await deleteStoredCosObjectIfConfigured(filePath)).deleted;
  }
  const local = resolvePrivateLocalUploadPath(filePath);
  const forumRoot = resolve(process.cwd(), process.env.PRIVATE_UPLOAD_DIR ?? "private-uploads", "forum-media");
  if (!local?.startsWith(`${forumRoot}${sep}`)) return false;
  try { await unlink(local); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  return true;
}
