import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOperationManualAssetPath } from "@/lib/operation-manuals";

const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") {
    return NextResponse.json({ message: "Manual asset not found." }, { status: 404 });
  }

  const { path } = await params;
  const assetPath = getOperationManualAssetPath(path.join("/"));
  if (!assetPath) {
    return NextResponse.json({ message: "Manual asset not found." }, { status: 404 });
  }

  try {
    const fileStat = await stat(assetPath);
    if (!fileStat.isFile()) return NextResponse.json({ message: "Manual asset not found." }, { status: 404 });

    const body = await readFile(assetPath);
    return new Response(body, {
      headers: {
        "Cache-Control": "private, max-age=86400",
        "Content-Length": String(fileStat.size),
        "Content-Type": contentTypes[extname(assetPath).toLowerCase()] ?? "application/octet-stream",
        "X-Robots-Tag": "noindex, nofollow"
      }
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ message: "Manual asset not found." }, { status: 404 });
    }
    throw error;
  }
}
