import { readFile, stat } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getHomepageAvatarVersion } from "@/lib/homepage-avatar";
import { getSecureCosMediaUrl, parseCosFilePath, parseCosPublicUrl } from "@/lib/storage";
import { getUploadDiskPath } from "@/lib/upload-path";

export const dynamic = "force-dynamic";
const maxAvatarBytes = 8 * 1024 * 1024;
const imageTypes: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
};
const avatarKeyPattern = /^user-avatars\/[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.(jpg|jpeg|png|webp|gif)$/i;

function unavailable() {
  return NextResponse.json({ message: "Avatar is not available." }, { status: 404, headers: { "Cache-Control": "no-store" } });
}

async function readLimitedImage(response: Response) {
  if (!response.body || Number(response.headers.get("content-length")) > maxAvatarBytes) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxAvatarBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id") ?? "";
  const version = params.get("v") ?? "";
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(id) || !/^[a-f0-9]{16}$/.test(version) || params.has("src")) return unavailable();

  try {
    // Only an avatar already selected for public homepage display is available.
    const comment = await prisma.comment.findFirst({
      where: { userId: id, status: "approved", showOnHomepage: true },
      select: { user: { select: { avatar: true } } },
    });
    const source = comment?.user.avatar?.trim();
    if (!source || getHomepageAvatarVersion(source) !== version) return unavailable();

    const cosPath = parseCosFilePath(source) ?? parseCosPublicUrl(source);
    let bytes: Buffer | null;
    let contentType: string;
    if (cosPath) {
      const extension = avatarKeyPattern.exec(cosPath.key)?.[1]?.toLowerCase();
      if (!extension || cosPath.bucket !== process.env.TENCENT_COS_BUCKET?.trim()) return unavailable();
      const signedUrl = await getSecureCosMediaUrl(source);
      if (!signedUrl) return unavailable();
      const upstream = await fetch(signedUrl, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8_000) });
      contentType = upstream.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
      if (!upstream.ok || !Object.values(imageTypes).includes(contentType)) {
        await upstream.body?.cancel();
        return unavailable();
      }
      bytes = await readLimitedImage(upstream);
    } else {
      const localKey = source.replace(/^\/(?:api\/)?uploads\//, "");
      const extension = avatarKeyPattern.exec(localKey)?.[1]?.toLowerCase();
      if (!/^\/(?:api\/)?uploads\//.test(source) || !extension) return unavailable();
      const diskPath = getUploadDiskPath(`/uploads/${localKey}`);
      const info = await stat(diskPath);
      if (!info.isFile() || info.size > maxAvatarBytes) return unavailable();
      bytes = await readFile(diskPath);
      contentType = imageTypes[extension];
    }
    if (!bytes?.length || bytes.length > maxAvatarBytes) return unavailable();
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=60, s-maxage=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return unavailable();
  }
}
