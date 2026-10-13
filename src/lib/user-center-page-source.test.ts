import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

describe("user center page source", () => {
  it("does not render the downloadable software panel in the account center", () => {
    const source = readFileSync(resolve(root, "src/app/user/page-shell.tsx"), "utf8");

    expect(source).not.toContain("t.userCenter.availableSoftware");
    expect(source).not.toContain("downloadableSoftware");
    expect(source).toContain("t.userCenter.purchasedSoftware");
    expect(source).toContain("t.userCenter.availableOnlineTools");
  });

  it("resolves private cloud avatars before rendering and replaces failed images with a supplied default avatar", () => {
    const source = readFileSync(resolve(root, "src/app/user/page-shell.tsx"), "utf8");
    const avatarPath = resolve(root, "src/components/user-avatar.tsx");

    expect(source).toContain("resolveUserAvatarSrc");
    expect(source).toContain("<UserAvatar");
    expect(existsSync(avatarPath)).toBe(true);
    if (!existsSync(avatarPath)) return;

    const avatar = readFileSync(avatarPath, "utf8");
    expect(avatar).toContain("onError");
    expect(avatar).toContain("!src || failed ? getDefaultAvatar(alt) : src");
  });
});
