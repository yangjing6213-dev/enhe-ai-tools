import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteStoredCosObjectIfConfigured, deleteStoredLocalFileIfSafe, saveUploadedFile } from "@/lib/storage";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin visual fixture storage isolation", () => {
  it("rejects uploads before reading file bytes or writing to storage", async () => {
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "1");
    const arrayBuffer = vi.fn(async () => {
      throw new Error("file bytes must not be read");
    });
    const file = {
      name: "fixture.png",
      size: 0,
      type: "image/png",
      arrayBuffer
    } as unknown as File;

    await expect(saveUploadedFile(file, { folder: "fixture", maxBytes: 1024 })).rejects.toThrow(
      "File storage is disabled in the admin visual fixture."
    );
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it("rejects stored-object deletion while the fixture is active", async () => {
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "1");

    await expect(deleteStoredCosObjectIfConfigured("not-a-cos-path", {})).rejects.toThrow(
      "File storage is disabled in the admin visual fixture."
    );
  });

  it("rejects local-file deletion while the fixture is active", async () => {
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "1");

    await expect(
      deleteStoredLocalFileIfSafe("/uploads/__fixture-file-that-is-not-created__.png")
    ).rejects.toThrow("File storage is disabled in the admin visual fixture.");
  });
});
