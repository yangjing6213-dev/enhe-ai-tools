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

  it("rejects passwords beyond bcrypt's UTF-8 byte limit", () => {
    expect(validatePasswordChangeInput("old-password", "a".repeat(73), "a".repeat(73)).ok).toBe(false);
    expect(validatePasswordChangeInput("old-password", "密".repeat(25), "密".repeat(25)).ok).toBe(false);
    expect(validatePasswordChangeInput("old-password", "a".repeat(72), "a".repeat(72)).ok).toBe(true);
  });
});
