import { readFileSync } from "node:fs";
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
});
