import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ putObject: vi.fn() }));
vi.mock("cos-nodejs-sdk-v5", () => ({ default: class { putObject = mocks.putObject; } }));
import { saveUploadedFile } from "@/lib/storage";
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("private COS upload", () => {
  it("sets a private object ACL even when the bucket defaults to public", async () => {
    for (const [key, value] of Object.entries({ TENCENT_COS_SECRET_ID: "test-id", TENCENT_COS_SECRET_KEY: "test-key", TENCENT_COS_BUCKET: "test-bucket", TENCENT_COS_REGION: "ap-test" })) vi.stubEnv(key, value);
    mocks.putObject.mockImplementation((_options, callback) => callback(null, {}));
    await saveUploadedFile(new File(["test"], "test.webp", { type: "image/webp" }), { folder: "forum-media", maxBytes: 1024, access: "private" });
    expect(mocks.putObject).toHaveBeenCalledWith(expect.objectContaining({ ACL: "private" }), expect.any(Function));
  });
});
