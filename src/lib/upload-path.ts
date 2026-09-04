import { join } from "node:path";

export function getUploadPublicUrl(fileUrlOrName: string) {
  const clean = fileUrlOrName.replace(/\\/g, "/").replace(/^\/+/, "");
  if (clean.startsWith("uploads/")) return `/${clean}`;
  return `/uploads/${clean}`;
}

export function getUploadDiskPath(publicUrl: string, cwd = process.cwd(), uploadDir = process.env.UPLOAD_DIR) {
  const fileName = publicUrl.split("/").filter(Boolean).at(-1) ?? "file";
  if (uploadDir) return join(uploadDir, fileName);
  return join(cwd, "public", "uploads", fileName);
}
