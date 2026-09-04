import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import { NextResponse } from "next/server";
import { getUploadDiskPath } from "@/lib/upload-path";

const imageMimeTypes: Record<string, string> = {
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function getImageContentType(fileName: string) {
  return imageMimeTypes[extname(fileName).toLowerCase()] ?? "application/octet-stream";
}

function isSafeUploadFileName(fileName: string) {
  return Boolean(fileName && !fileName.includes("/") && !fileName.includes("\\") && fileName !== "." && fileName !== "..");
}

export async function GET(_: Request, { params }: { params: Promise<{ fileName: string }> }) {
  const { fileName } = await params;
  const decodedFileName = decodeURIComponent(fileName);

  if (!isSafeUploadFileName(decodedFileName)) {
    return NextResponse.json({ message: "Invalid upload file name." }, { status: 400 });
  }

  const diskPath = getUploadDiskPath(`/uploads/${decodedFileName}`);

  try {
    const fileStat = await stat(diskPath);
    if (!fileStat.isFile()) return NextResponse.json({ message: "Upload file not found." }, { status: 404 });

    const body = await readFile(diskPath);
    return new Response(body, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(fileStat.size),
        "Content-Type": getImageContentType(decodedFileName)
      }
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ message: "Upload file not found." }, { status: 404 });
    }
    throw error;
  }
}
