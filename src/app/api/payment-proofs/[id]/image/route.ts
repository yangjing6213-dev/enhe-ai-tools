import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeImageSrc } from "@/lib/media";
import { getSecureFileDownloadUrl, parseCosFilePath } from "@/lib/storage";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const proof = await prisma.paymentProof.findUnique({
    where: { id },
    select: { proofImage: true, userId: true }
  });

  if (!proof || (proof.userId !== user.id && user.role !== "admin")) {
    return NextResponse.json({ message: "无权查看付款凭证。" }, { status: 404 });
  }

  try {
    const target = parseCosFilePath(proof.proofImage)
      ? await getSecureFileDownloadUrl({ filePath: proof.proofImage, fileUrl: null }, request.url)
      : new URL(normalizeImageSrc(proof.proofImage) ?? "/", request.url);
    return NextResponse.redirect(target);
  } catch {
    return NextResponse.json({ message: "付款凭证图片暂时无法预览。" }, { status: 404 });
  }
}
