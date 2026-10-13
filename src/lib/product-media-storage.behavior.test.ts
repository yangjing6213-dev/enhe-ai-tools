import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveUploadedFile } from "@/lib/storage";
import { isLikelyUploadableImage, isLikelyUploadableVideo } from "@/lib/media";
let directory: string | undefined;
afterEach(async () => { vi.unstubAllEnvs(); if (directory) await rm(directory, { recursive: true }); directory = undefined; });

describe("isolated product media storage", () => {
  it("writes image and video bytes to a temporary local upload folder", async () => {
    directory = await mkdtemp(join(tmpdir(), "enhe-media-test-"));
    vi.stubEnv("UPLOAD_DIR", directory);
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "");
    vi.stubEnv("TENCENT_COS_SECRET_ID", "");
    for (const [name, type, accept] of [["picture.png", "image/png", isLikelyUploadableImage], ["demo.mp4", "video/mp4", isLikelyUploadableVideo]] as const) {
      const payload = Buffer.from("isolated synthetic media bytes");
      const stored = await saveUploadedFile(new File([payload], name, { type }), { folder: "local-probe", maxBytes: 1024, accept });
      expect(stored.storage).toBe("local");
      expect(stored.filePath.startsWith(directory)).toBe(true);
      expect(await readFile(stored.filePath)).toEqual(payload);
    }
  });
  it("rejects oversized or invalid media before writing files", async () => {
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "");
    await expect(saveUploadedFile(new File(["123"], "picture.png", { type: "image/png" }), { folder: "local-probe", maxBytes: 2, accept: isLikelyUploadableImage })).rejects.toThrow();
    await expect(saveUploadedFile(new File(["text"], "bad.txt", { type: "text/plain" }), { folder: "local-probe", maxBytes: 1024, accept: isLikelyUploadableImage })).rejects.toThrow();
  });
});
