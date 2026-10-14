import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(
  new URL("../app/admin/comments/page.tsx", import.meta.url),
  "utf8",
);

describe("admin comment avatars", () => {
  it("resolves stored avatar values and shows a stable fallback", () => {
    expect(page).toContain("resolveUserAvatarSrc");
    expect(page).toContain("avatarSrc");
    expect(page).toContain("<UserAvatar");
    expect(page).toContain("fallbackSeed={comment.user.id}");
    expect(page).not.toMatch(/<Image\s+src=\{comment\.user\.avatar\}/);
  });
});
