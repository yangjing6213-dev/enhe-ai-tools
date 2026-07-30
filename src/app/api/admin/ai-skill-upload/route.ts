import { NextResponse } from "next/server";
import {
  aiSkillPackageMaxBytes,
  isZipFileSignature,
  validateAiSkillPackage,
} from "@/lib/ai-skill";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveUploadedFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await requireAdmin();
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "请选择 Skill ZIP 压缩包。" }, { status: 400 });
  }

  const validationError = validateAiSkillPackage(file);
  if (validationError) {
    const status = file.size > aiSkillPackageMaxBytes ? 413 : 400;
    return NextResponse.json({ message: validationError }, { status });
  }

  const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (!isZipFileSignature(signature)) {
    return NextResponse.json(
      { message: "文件内容不是有效的 ZIP 压缩包。" },
      { status: 400 },
    );
  }

  try {
    const stored = await saveUploadedFile(file, {
      folder: "ai-skills",
      maxBytes: aiSkillPackageMaxBytes,
      access: "private",
      accept: (candidate) => validateAiSkillPackage(candidate) === null,
      invalidTypeMessage: "仅支持上传有效的 ZIP 格式 Skill 压缩包。",
    });
    const record = await prisma.file.create({
      data: {
        fileName: stored.fileName,
        filePath: stored.filePath,
        fileUrl: stored.storage === "local" ? null : stored.fileUrl,
        fileSize: BigInt(stored.fileSize),
        mimeType: stored.mimeType,
      },
    });

    return NextResponse.json({
      id: record.id,
      fileName: record.fileName,
      fileSize: record.fileSize?.toString(),
      message: "Skill ZIP 压缩包上传成功。",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败，请稍后重试。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
