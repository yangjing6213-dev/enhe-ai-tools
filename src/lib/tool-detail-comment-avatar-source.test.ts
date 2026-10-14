import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageShell = readFileSync(
  new URL("../app/tools/[slug]/page-shell.tsx", import.meta.url),
  "utf8",
);

describe("product detail comment avatars", () => {
  it("resolves stored avatar paths and keeps a fallback when an image cannot load", () => {
    expect(pageShell).toContain("resolveUserAvatarSrc");
    expect(pageShell).toContain("getDefaultAvatar");
    expect(pageShell).toMatch(/await resolveUserAvatarSrc\(comment\.user\.avatar\)/);
    expect(pageShell).toContain("<UserAvatar");
    expect(pageShell).toContain("src={comment.avatarSrc}");
    expect(pageShell).not.toMatch(/<Image\s+src=\{comment\.user\.avatar\}/);
  });
});
