import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultEmojis } from "./emojis";

const mocks = vi.hoisted(() => ({ catalog: vi.fn(), getObjectUrl: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/emojis-server", () => ({ getPublicEmojiCatalog: mocks.catalog }));
vi.mock("cos-nodejs-sdk-v5", () => ({ default: class { getObjectUrl = mocks.getObjectUrl; } }));
import { GET } from "@/app/api/emojis/[id]/route";

const id = "enhe_abcdef123456";
const key = `emojis/123-${id}.webp`;
const entry = { ...defaultEmojis[0], id, url: `https://test-bucket.cos.ap-test.myqcloud.com/${key}` };
const request = () => GET(new Request(`https://example.test/api/emojis/${id}`), { params: Promise.resolve({ id }) });

describe("emoji proxy with the real COS signing guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const [name, value] of Object.entries({ TENCENT_COS_SECRET_ID: "fixture-id", TENCENT_COS_SECRET_KEY: "fixture-key", TENCENT_COS_BUCKET: "test-bucket", TENCENT_COS_REGION: "ap-test" })) vi.stubEnv(name, value);
    mocks.catalog.mockResolvedValue([entry]);
    mocks.getObjectUrl.mockImplementation((_options, callback) => callback(null, { Url: `${entry.url}?fixture-signature=1` }));
    const bytes = new Uint8Array([82, 73, 70, 70, 8, 0, 0, 0, 87, 69, 66, 80, 1, 2, 3, 4]);
    mocks.fetch.mockImplementation(async () => new Response(bytes, { headers: { "Content-Type": "image/webp", "Content-Length": String(bytes.length) } }));
    vi.stubGlobal("fetch", mocks.fetch);
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("signs only the registered object in the configured bucket", async () => {
    const response = await request();
    expect(response.status).toBe(200);
    await response.arrayBuffer();
    expect(mocks.getObjectUrl).toHaveBeenCalledWith(expect.objectContaining({ Bucket: "test-bucket", Region: "ap-test", Key: key, Sign: true, Method: "GET" }), expect.any(Function));
    expect(mocks.fetch).toHaveBeenCalledWith(new URL(`${entry.url}?fixture-signature=1`), expect.objectContaining({ redirect: "error" }));
  });

  it("refuses a different bucket before invoking the SDK or fetch", async () => {
    mocks.catalog.mockResolvedValue([{ ...entry, url: `https://other-bucket.cos.ap-test.myqcloud.com/${key}` }]);
    expect((await request()).status).toBe(404);
    expect(mocks.getObjectUrl).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("refuses non-emoji paths even within the configured bucket", async () => {
    mocks.catalog.mockResolvedValue([{ ...entry, url: "https://test-bucket.cos.ap-test.myqcloud.com/private/secret.webp" }]);
    expect((await request()).status).toBe(404);
    expect(mocks.getObjectUrl).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
