import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultEmojis, emojiImageSource, maxEmojiUploadBytes } from "@/lib/emojis";

const mocks = vi.hoisted(() => ({ catalog: vi.fn(), signed: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/emojis-server", () => ({ getPublicEmojiCatalog: mocks.catalog }));
vi.mock("@/lib/storage", () => ({ getSecureCosMediaUrl: mocks.signed }));
import { GET } from "./route";

const entry = { ...defaultEmojis[0], id: "enhe_abcdef123456", url: "https://test-bucket.cos.ap-test.myqcloud.com/emojis/123-enhe_abcdef123456.webp" };
const webp = new Uint8Array([82, 73, 70, 70, 8, 0, 0, 0, 87, 69, 66, 80, 1, 2, 3, 4]);
const request = (id = entry.id) => GET(new Request(`https://example.test/api/emojis/${id}?src=https://evil.test/secret`), { params: Promise.resolve({ id }) });
const upstream = (type = "image/webp", length = String(webp.length)) => new Response(webp, { headers: { "Content-Type": type, "Content-Length": length } });

describe("registered private COS emoji proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.catalog.mockResolvedValue([entry]);
    mocks.signed.mockResolvedValue(new URL(`${entry.url}?q-signature=private`));
    mocks.fetch.mockResolvedValue(upstream());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("uses same-site image URLs for COS stickers and keeps bundled/local paths", () => {
    expect(emojiImageSource(entry)).toBe(`/api/emojis/${entry.id}`);
    expect(emojiImageSource(defaultEmojis[0])).toBe(defaultEmojis[0].url);
    expect(emojiImageSource({ ...entry, url: "/uploads/emojis/123-enhe_abcdef123456.webp" })).toBe(`/api/emojis/${entry.id}`);
    expect(emojiImageSource({ ...entry, url: "/uploads/123-emojis-124-enhe-abcdef123456.webp" })).toBe(`/api/emojis/${entry.id}`);
  });

  it("streams registered WebP bytes without exposing signed addresses", async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Location")).toBeNull();
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(webp);
    expect(mocks.signed).toHaveBeenCalledWith(entry.url);
    expect(mocks.fetch).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ redirect: "error", cache: "no-store" }));
  });

  it("continues serving archived registered stickers", async () => {
    mocks.catalog.mockResolvedValue([{ ...entry, enabled: false }]);
    expect((await request()).status).toBe(200);
  });

  it("does not fetch unknown IDs, arbitrary addresses or paths outside emojis", async () => {
    expect((await request("enhe_unknown")).status).toBe(404);
    for (const url of ["https://evil.test/emojis/test.webp", "https://test-bucket.cos.ap-test.myqcloud.com/private/test.webp", "https://test-bucket.cos.ap-test.myqcloud.com/emojis/test.svg"]) {
      mocks.catalog.mockResolvedValue([{ ...entry, url }]);
      expect((await request()).status).toBe(404);
    }
    expect(mocks.signed).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("rejects a source that the configured-bucket signing helper refuses", async () => {
    mocks.signed.mockResolvedValue(null);
    expect((await request()).status).toBe(404);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("rejects wrong content types, signatures, missing sizes and excessive sizes", async () => {
    for (const response of [upstream("text/html"), upstream("image/webp", String(maxEmojiUploadBytes + 1)), new Response(webp, { headers: { "Content-Type": "image/webp" } }), new Response("<script>evil</script>", { headers: { "Content-Type": "image/webp", "Content-Length": "21" } })]) {
      mocks.fetch.mockResolvedValueOnce(response);
      expect((await request()).status).toBe(404);
    }
  });

  it("bounds actual streamed bytes even when the upstream size is inaccurate", async () => {
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(webp); controller.enqueue(new Uint8Array(maxEmojiUploadBytes)); controller.close(); } });
    mocks.fetch.mockResolvedValue(new Response(body, { headers: { "Content-Type": "image/webp", "Content-Length": String(webp.length) } }));
    const response = await request();
    await expect(response.arrayBuffer()).rejects.toThrow();
  });

  it("returns a generic unavailable result for redirects and signing errors", async () => {
    mocks.fetch.mockRejectedValueOnce(new Error("private-signature-and-host"));
    const response = await request();
    expect(response.status).toBe(404);
    expect(JSON.stringify(await response.json())).not.toContain("private-signature");
    mocks.signed.mockRejectedValueOnce(new Error("credentials-must-not-leak"));
    expect((await request()).status).toBe(404);
  });
});
