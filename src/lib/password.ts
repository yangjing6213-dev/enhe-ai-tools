type PasswordValidationResult = { ok: true } | { ok: false; message: string };

export function validatePasswordChangeInput(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): PasswordValidationResult {
  if (!currentPassword.trim()) {
    return { ok: false, message: "请输入当前密码" };
  }

  if (newPassword.length < 8) {
    return { ok: false, message: "新密码至少需要 8 位" };
  }

  if (newPassword !== confirmPassword) {
    return { ok: false, message: "两次输入的新密码不一致" };
  }

  if (currentPassword === newPassword) {
    return { ok: false, message: "新密码不能与当前密码相同" };
  }

  return { ok: true };
}
