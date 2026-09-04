import { describe, expect, it } from "vitest";
import { validatePasswordChangeInput } from "@/lib/password";

describe("validatePasswordChangeInput", () => {
  it("rejects blank current password", () => {
    expect(validatePasswordChangeInput("", "new-password", "new-password")).toEqual({
      ok: false,
      message: "请输入当前密码"
    });
  });

  it("rejects short new password", () => {
    expect(validatePasswordChangeInput("old-password", "short", "short")).toEqual({
      ok: false,
      message: "新密码至少需要 8 位"
    });
  });

  it("rejects mismatched confirmation", () => {
    expect(validatePasswordChangeInput("old-password", "new-password", "other-password")).toEqual({
      ok: false,
      message: "两次输入的新密码不一致"
    });
  });

  it("rejects reusing the current password", () => {
    expect(validatePasswordChangeInput("same-password", "same-password", "same-password")).toEqual({
      ok: false,
      message: "新密码不能与当前密码相同"
    });
  });

  it("accepts a valid password change", () => {
    expect(validatePasswordChangeInput("old-password", "new-password", "new-password")).toEqual({ ok: true });
  });
});
