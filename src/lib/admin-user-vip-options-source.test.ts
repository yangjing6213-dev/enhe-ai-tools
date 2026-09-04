import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin user paid-download mode source", () => {
  it("does not expose manual VIP controls in user details", () => {
    const source = readFileSync(new URL("../app/admin/users/[id]/page.tsx", import.meta.url), "utf8");

    expect(source).not.toContain("adjustVipAdminAction");
    expect(source).not.toContain("manualVip");
    expect(source).not.toContain("durationDays");
    expect(source).not.toContain("vip1");
  });
});
