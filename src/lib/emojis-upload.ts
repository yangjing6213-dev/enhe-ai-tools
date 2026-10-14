import sharp from "sharp";
import { EmojiCatalogError, maxEmojiUploadBytes } from "./emojis";

export class EmojiRequestTooLargeError extends EmojiCatalogError {}

export async function readBoundedEmojiRequest(request: Request, maxBytes: number) {
  const tooLarge = () => new EmojiRequestTooLargeError("上传内容超过大小限制，请缩小图片或表情目录后重试。");
  if (Number(request.headers.get("content-length")) > maxBytes) throw tooLarge();
  const reader = request.body?.getReader();
  if (!reader) return new Request(request.url, { method: request.method, headers: request.headers });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw tooLarge(); }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new Request(request.url, { method: request.method, headers: request.headers, body: body.buffer });
}

export async function prepareEmojiUpload(file: File, id: string) {
  if (!file.size || file.size > maxEmojiUploadBytes) throw new EmojiCatalogError("表情图片请控制在 4MB 以内。");
  if (!/^enhe_[a-z0-9]{2,32}$/.test(id)) throw new EmojiCatalogError("表情编号无效。");
  const bytes = Buffer.from(await file.arrayBuffer());
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  const mime = png ? "image/png" : jpeg ? "image/jpeg" : webp ? "image/webp" : null;
  if (!mime || file.type !== mime) throw new EmojiCatalogError("仅支持真实的 PNG、JPG 或 WebP 图片，不支持 SVG。");
  try {
    const image = sharp(bytes, { limitInputPixels: 16 * 1024 * 1024, failOn: "error" });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096 || (metadata.pages ?? 1) > 1) {
      throw new Error("图片尺寸过大或包含动画。 ");
    }
    const output = await image.rotate().resize(256, 256, { fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
    return new File([new Uint8Array(output)], `${id}.webp`, { type: "image/webp" });
  } catch {
    throw new EmojiCatalogError("图片无法读取；请使用不超过 4096×4096 的静态 PNG、JPG 或 WebP。");
  }
}
