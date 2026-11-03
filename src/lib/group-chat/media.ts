import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import sharp from "sharp";

const allowedImages = new Map([
  [".jpg", { mime: "image/jpeg", format: "jpeg" }],
  [".jpeg", { mime: "image/jpeg", format: "jpeg" }],
  [".png", { mime: "image/png", format: "png" }],
  [".webp", { mime: "image/webp", format: "webp" }],
]);

export async function normalizeChatImage(input: File, maxBytes: number) {
  if (input.size <= 0 || input.size > maxBytes) throw new Error("CHAT_MEDIA_SIZE");
  const format = allowedImages.get(extname(input.name).toLowerCase());
  if (!format || input.type !== format.mime) throw new Error("CHAT_MEDIA_TYPE");
  const bytes = Buffer.from(await input.arrayBuffer());
  try {
    const decoder = sharp(bytes, { limitInputPixels: 24_000_000, animated: true, failOn: "warning" });
    const metadata = await decoder.metadata();
    if (metadata.format !== format.format || !metadata.width || !metadata.height || metadata.width * metadata.height > 24_000_000 || (metadata.pages ?? 1) !== 1) throw new Error("CHAT_MEDIA_TYPE");
    const normalized = await decoder.rotate().webp({ quality: 86 }).toBuffer();
    if (normalized.length > maxBytes) throw new Error("CHAT_MEDIA_SIZE");
    const thumbnail = await sharp(normalized, { limitInputPixels: 24_000_000 }).resize(640, 640, { fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    const safeName = input.name.split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 160) || "image";
    return {
      originalName: safeName,
      originalBytes: input.size,
      width: metadata.width,
      height: metadata.height,
      file: new File([new Uint8Array(normalized)], `${randomUUID()}.webp`, { type: "image/webp" }),
      thumbnail: new File([new Uint8Array(thumbnail)], `${randomUUID()}-thumb.webp`, { type: "image/webp" }),
    };
  } catch (error) {
    if (error instanceof Error && ["CHAT_MEDIA_SIZE", "CHAT_MEDIA_TYPE"].includes(error.message)) throw error;
    throw new Error("CHAT_MEDIA_TYPE");
  }
}
