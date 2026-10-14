import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { isSafeEmojiUrl, maxEmojiUploadBytes } from "@/lib/emojis";
import { getPublicEmojiCatalog } from "@/lib/emojis-server";
import { getSecureCosMediaUrl } from "@/lib/storage";
import { getUploadDiskPath } from "@/lib/upload-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

function unavailable() {
  return NextResponse.json({ code: "EMOJI_IMAGE_NOT_AVAILABLE" }, {
    status: 404, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}

async function boundedWebpBody(body: ReadableStream<Uint8Array>, expectedSize: number) {
  const reader = body.getReader();
  const initial: Uint8Array[] = [];
  let size = 0;
  const invalid = () => new Error("EMOJI_IMAGE_NOT_AVAILABLE");
  try {
    while (size < 12) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > expectedSize || size > maxEmojiUploadBytes) throw invalid();
      initial.push(result.value);
    }
    const signature = Buffer.concat(initial, 12);
    if (size < 12 || signature.toString("ascii", 0, 4) !== "RIFF" || signature.toString("ascii", 8, 12) !== "WEBP") throw invalid();
  } catch {
    await reader.cancel().catch(() => {});
    throw invalid();
  }
  return new ReadableStream<Uint8Array>({
    start(controller) { for (const chunk of initial) controller.enqueue(chunk); },
    async pull(controller) {
      try {
        const result = await reader.read();
        if (result.done) {
          if (size !== expectedSize) throw invalid();
          controller.close();
          return;
        }
        size += result.value.byteLength;
        if (size > expectedSize || size > maxEmojiUploadBytes) throw invalid();
        controller.enqueue(result.value);
      } catch {
        await reader.cancel().catch(() => {});
        controller.error(invalid());
      }
    },
    async cancel(reason) { await reader.cancel(reason); }
  });
}

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!/^enhe_[a-z0-9]{2,32}$/.test(id)) return unavailable();
  try {
    const entry = (await getPublicEmojiCatalog()).find((item) => item.id === id);
    if (!entry || !isSafeEmojiUrl(entry.url)) return unavailable();
    let body: ReadableStream<Uint8Array>;
    let size: number;
    if (entry.url.startsWith("/uploads/")) {
      const diskPath = getUploadDiskPath(entry.url);
      const file = await stat(diskPath);
      if (!file.isFile() || file.size < 12 || file.size > maxEmojiUploadBytes) return unavailable();
      size = file.size;
      body = Readable.toWeb(createReadStream(diskPath)) as ReadableStream<Uint8Array>;
    } else {
      if (!entry.url.startsWith("https://")) return unavailable();
      // The signing helper checks the configured bucket. The catalog confines
      // the key to a single WebP object in the emojis folder.
      const signed = await getSecureCosMediaUrl(entry.url);
      if (!signed) return unavailable();
      const upstream = await fetch(signed, { redirect: "error", cache: "no-store", signal: request.signal });
      const sizeHeader = upstream.headers.get("Content-Length");
      size = Number(sizeHeader);
      const mime = upstream.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
      if (upstream.status !== 200 || !upstream.body || mime !== "image/webp" || !sizeHeader || !Number.isInteger(size) || size < 12 || size > maxEmojiUploadBytes) {
        await upstream.body?.cancel().catch(() => {});
        return unavailable();
      }
      body = upstream.body;
    }
    return new Response(await boundedWebpBody(body, size), { headers: {
      "Content-Type": "image/webp", "Content-Length": String(size), "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=300"
    } });
  } catch {
    return unavailable();
  }
}
