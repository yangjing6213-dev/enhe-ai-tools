import { describe, expect, it } from "vitest";
import { isValidAvatarFile, MAX_AVATAR_FILE_BYTES } from "@/lib/avatar-file";

describe("avatar uploads", () => {
  it("accepts small PNG, JPEG, and WebP files with matching signatures", async () => {
    const files = [
      new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "avatar.png", { type: "image/png" }),
      new File([new Uint8Array([255, 216, 255, 0])], "avatar.jpg", { type: "image/jpeg" }),
      new File([new Uint8Array([82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80])], "avatar.webp", { type: "image/webp" })
    ];

    for (const file of files) await expect(isValidAvatarFile(file)).resolves.toBe(true);
  });

  it("rejects a misleading file extension, unsupported media, and files over the size limit", async () => {
    const mislabeled = new File(["not an image"], "avatar.png", { type: "image/png" });
    const unsupported = new File(["data"], "avatar.svg", { type: "image/svg+xml" });
    const tooLarge = new File([new Uint8Array(MAX_AVATAR_FILE_BYTES + 1)], "avatar.png", { type: "image/png" });

    await expect(isValidAvatarFile(mislabeled)).resolves.toBe(false);
    await expect(isValidAvatarFile(unsupported)).resolves.toBe(false);
    await expect(isValidAvatarFile(tooLarge)).resolves.toBe(false);
  });
});
