import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSecureCosMediaUrl, parseCosFilePath, parseCosPublicUrl } from "@/lib/storage";

async function isPublishedVideo(source: string) {
  const file = parseCosFilePath(source) ?? parseCosPublicUrl(source);
  if (!file || file.bucket !== process.env.TENCENT_COS_BUCKET?.trim() || !file.key.startsWith("tool-videos/") || !/\.(mp4|webm|mov|m4v)$/i.test(file.key)) return false;
  if (file.key.split("/").some((part) => !part || part === "." || part === ".." || /[\\%\x00-\x1f]/.test(part))) return false;

  const sources = new Set([source, `cos://${file.bucket}/${file.key}`]);
  const region = process.env.TENCENT_COS_REGION?.trim();
  if (region) {
    for (const host of ["myqcloud.com", "tencentcos.cn"]) {
      const base = `https://${file.bucket}.cos.${region}.${host}/`;
      sources.add(base + file.key);
      sources.add(base + file.key.split("/").map(encodeURIComponent).join("/"));
    }
  }
  const videoUrl = { in: [...sources] };
  const matches = await Promise.all([
    prisma.tool.findFirst({ where: { status: "published", OR: [{ videoUrl }, { videoUrl2: videoUrl }, { videoUrl3: videoUrl }] }, select: { id: true } }),
    prisma.tutorial.findFirst({ where: { status: "active", tool: { status: "published" }, videoUrl }, select: { id: true } }),
    prisma.productDemo.findFirst({ where: { status: "published", videoUrl }, select: { id: true } })
  ]);
  return matches.some(Boolean);
}

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get("src")?.trim();
  if (!source) {
    return NextResponse.json({ message: "Missing product video source." }, { status: 400 });
  }

  try {
    if (!await isPublishedVideo(source)) {
      return NextResponse.json({ message: "Product video source is not available." }, { status: 404 });
    }
    const signedUrl = await getSecureCosMediaUrl(source);
    if (!signedUrl) {
      return NextResponse.json({ message: "Product video source is not available." }, { status: 404 });
    }

    const response = NextResponse.redirect(signedUrl);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.json({ message: "Product video source is not available." }, { status: 404 });
  }
}
