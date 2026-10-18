import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { Readable } from "node:stream";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeImageSrc } from "@/lib/media";
import { getSecureFileDownloadUrl, parseCosFilePath, parseCosPublicUrl, resolvePrivateLocalUploadPath } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const proof = await prisma.paymentProof.findUnique({
    where: { id },
    select: { proofImage: true, userId: true }
  });

  if (!proof || (proof.userId !== user.id && user.role !== "admin")) {
    return NextResponse.json({ message: "无权查看付款凭证。" }, { status: 404, headers: privateHeaders });
  }

  try {
    const cos = parseCosFilePath(proof.proofImage) ?? parseCosPublicUrl(proof.proofImage);
    if (cos) {
      if (cos.bucket !== process.env.TENCENT_COS_BUCKET?.trim() || !/^payment-proofs\/[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.(png|jpe?g|webp|gif)$/i.test(cos.key)) {
        throw new Error("Invalid proof namespace");
      }
      const target = await getSecureFileDownloadUrl({ filePath: `cos://${cos.bucket}/${cos.key}`, fileUrl: null }, request.url);
      return NextResponse.redirect(target, { headers: privateHeaders });
    }
    const local = resolvePrivateLocalUploadPath(proof.proofImage);
    if (local) {
      const proofDirectory = resolve(process.cwd(), process.env.PRIVATE_UPLOAD_DIR ?? "private-uploads", "payment-proofs");
      if (dirname(local) !== proofDirectory) throw new Error("Invalid proof directory");
      const mimeTypes: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };
      const mime = mimeTypes[extname(local).toLowerCase()];
      const file = await stat(local);
      if (!mime || !file.isFile()) throw new Error("Invalid proof image");
      return new Response(Readable.toWeb(createReadStream(local)) as ReadableStream<Uint8Array>, {
        headers: { ...privateHeaders, "Content-Type": mime, "Content-Length": String(file.size), "Content-Disposition": "inline" }
      });
    }
    // Legacy externally hosted proofs remain readable; existing COS ACLs are remediated separately.
    const normalized = normalizeImageSrc(proof.proofImage);
    if (!normalized || !/^(https?:\/\/|\/api\/uploads\/)/i.test(normalized)) throw new Error("Invalid proof path");
    return NextResponse.redirect(new URL(normalized, request.url), { headers: privateHeaders });
  } catch {
    return NextResponse.json({ message: "付款凭证图片暂时无法预览。" }, { status: 404, headers: privateHeaders });
  }
}
