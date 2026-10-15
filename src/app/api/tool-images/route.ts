import { NextResponse } from "next/server";
import { getPublicSoftwareCatalogCovers } from "@/lib/public-content";
import { getSecureCosMediaUrl } from "@/lib/storage";
import { isToolImageSource } from "@/lib/tool-image";

export const dynamic = "force-dynamic";
const maxCatalogImageBytes = 8 * 1024 * 1024;
const catalogImageMimeTypes = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

async function readLimitedImageBody(body: ReadableStream<Uint8Array> | null) {
  if (!body) return null;

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxCatalogImageBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const image = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    image.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return image;
}

async function getCatalogImageResponse(source: string) {
  const signedUrl = await getSecureCosMediaUrl(source);
  if (!signedUrl) return null;

  const upstream = await fetch(signedUrl, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  });
  if (!upstream.ok) return null;

  const contentType = upstream.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (!contentType || !catalogImageMimeTypes.has(contentType)) return null;

  const contentLength = Number(upstream.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxCatalogImageBytes) return null;

  const image = await readLimitedImageBody(upstream.body);
  if (!image) return null;

  return new Response(image, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
      "Content-Length": String(image.byteLength),
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const toolId = searchParams.get("id")?.trim();
  const optimizerSource = searchParams.get("mode") === "optimizer-source";
  let source = searchParams.get("src")?.trim();

  if (toolId) {
    const covers = await getPublicSoftwareCatalogCovers();
    source = covers.find((cover) => cover.id === toolId)?.coverImage?.trim();
    if (!source) {
      return NextResponse.json(
        { message: "Product image source is not available." },
        { status: 404 },
      );
    }
  }

  if (optimizerSource) {
    if (!toolId || !source || !isToolImageSource(source)) {
      return NextResponse.json(
        { message: "Product image source is not available." },
        { status: 404 },
      );
    }

    try {
      const response = await getCatalogImageResponse(source);
      return response ?? NextResponse.json(
        { message: "Product image source is not available." },
        { status: 404 },
      );
    } catch {
      return NextResponse.json(
        { message: "Product image source is not available." },
        { status: 404 },
      );
    }
  }

  if (!source) {
    return NextResponse.json({ message: "Missing product image source." }, { status: 400 });
  }
  if (!isToolImageSource(source)) {
    return NextResponse.json({ message: "Product image source is not available." }, { status: 404 });
  }

  try {
    const signedUrl = await getSecureCosMediaUrl(source);
    if (!signedUrl) {
      return NextResponse.json({ message: "Product image source is not available." }, { status: 404 });
    }

    const response = NextResponse.redirect(signedUrl);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.json({ message: "Product image source is not available." }, { status: 404 });
  }
}
