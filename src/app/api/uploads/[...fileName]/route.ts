import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getLegacyProductImageFallback } from "@/lib/legacy-product-images";
import { getUploadDiskPath } from "@/lib/upload-path";

const uploadMimeTypes: Record<string, string> = {
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".webm": "video/webm"
};

function getUploadContentType(fileName: string) {
  return uploadMimeTypes[extname(fileName).toLowerCase()] ?? "application/octet-stream";
}

function isSafeUploadPath(parts: string[]) {
  return Boolean(parts.length && parts.every((part) => part && !part.includes("\\") && part !== "." && part !== ".."));
}

function parseRangeHeader(rangeHeader: string | null, fileSize: number) {
  if (!rangeHeader?.startsWith("bytes=")) return null;

  const range = rangeHeader.slice("bytes=".length).split(",")[0]?.trim();
  if (!range) return null;

  const [startText, endText] = range.split("-");
  let start: number;
  let end: number;

  if (!startText) {
    const suffixLength = Number(endText);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return "invalid" as const;
    start = Math.max(fileSize - suffixLength, 0);
    end = fileSize - 1;
  } else {
    start = Number(startText);
    end = endText ? Number(endText) : fileSize - 1;
  }

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= fileSize) {
    return "invalid" as const;
  }

  return { start, end: Math.min(end, fileSize - 1) };
}

function streamUploadFile(diskPath: string, range?: { start: number; end: number }) {
  const stream = range ? createReadStream(diskPath, range) : createReadStream(diskPath);
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

export async function GET(request: Request, { params }: { params: Promise<{ fileName: string[] }> }) {
  const { fileName } = await params;
  const decodedParts = fileName.map((part) => decodeURIComponent(part));

  if (!isSafeUploadPath(decodedParts)) {
    return NextResponse.json({ message: "Invalid upload file name." }, { status: 400 });
  }

  const uploadPath = decodedParts.join("/");
  const diskPath = getUploadDiskPath(`/uploads/${uploadPath}`);

  try {
    const fileStat = await stat(diskPath);
    if (!fileStat.isFile()) return NextResponse.json({ message: "Upload file not found." }, { status: 404 });

    const contentType = getUploadContentType(uploadPath);
    const range = parseRangeHeader(request.headers.get("range"), fileStat.size);
    if (range === "invalid") {
      return new Response(null, {
        status: 416,
        headers: {
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes */${fileStat.size}`
        }
      });
    }

    if (range) {
      return new Response(streamUploadFile(diskPath, range), {
        status: 206,
        headers: {
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": String(range.end - range.start + 1),
          "Content-Range": `bytes ${range.start}-${range.end}/${fileStat.size}`,
          "Content-Type": contentType
        }
      });
    }

    return new Response(streamUploadFile(diskPath), {
      headers: {
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(fileStat.size),
        "Content-Type": contentType
      }
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      const fallback = getLegacyProductImageFallback(uploadPath);
      if (fallback) return NextResponse.redirect(new URL(fallback, request.url), 307);
      return NextResponse.json({ message: "Upload file not found." }, { status: 404 });
    }
    throw error;
  }
}
