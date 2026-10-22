import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertValidCsrfToken: vi.fn(),
  assertRegistrationNotLimited: vi.fn(),
  createUser: vi.fn(),
  findUser: vi.fn(),
  hashPassword: vi.fn(),
  trackEvent: vi.fn(),
  getCurrentLocale: vi.fn(),
  headers: vi.fn(),
  recordLoginAttempt: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  sendAdminLoginSecurityEmail: vi.fn(),
  signInUser: vi.fn(),
  requireUser: vi.fn(),
  updatePasswordAndRevokeSessions: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: mocks.findUser, create: mocks.createUser } } }));
vi.mock("@/lib/auth", () => ({
  assertLoginNotLimited: vi.fn(),
  assertRegistrationNotLimited: mocks.assertRegistrationNotLimited,
  getCurrentUser: vi.fn(),
  hashPassword: mocks.hashPassword,
  recordLoginAttempt: mocks.recordLoginAttempt,
  requireAdmin: vi.fn(),
  requireUser: mocks.requireUser,
  refreshHeaderUserCookieSnapshot: vi.fn(),
  signInUser: mocks.signInUser,
  signOutUser: vi.fn(),
  verifyPassword: mocks.verifyPassword,
  updatePasswordAndRevokeSessions: mocks.updatePasswordAndRevokeSessions,
}));
vi.mock("@/lib/csrf", () => ({ assertValidCsrfToken: mocks.assertValidCsrfToken }));
vi.mock("@/lib/analytics", () => ({ trackAnalyticsEvent: mocks.trackEvent }));
vi.mock("@/lib/i18n", () => ({ getCurrentLocale: mocks.getCurrentLocale }));
vi.mock("@/lib/admin-email-notifications", () => ({
  sendAdminLoginSecurityEmail: mocks.sendAdminLoginSecurityEmail,
  sendNewOrderAdminEmail: vi.fn(),
  sendOrderReceiptAdminEmail: vi.fn(),
  sendPaymentProofSubmittedAdminEmail: vi.fn(),
  sendPaymentReviewAdminEmail: vi.fn(),
  sendRefundRequestAdminEmail: vi.fn(),
}));

import { changePasswordAction, loginAction, registerAction } from "@/app/actions";

function loginForm(returnTo: string) {
  const formData = new FormData();
  formData.set("email", "admin@example.com");
  formData.set("password", "correct-horse-battery");
  formData.set("csrfToken", "csrf-token");
  formData.set("returnTo", returnTo);
  return formData;
}

function registrationForm() {
  const formData = new FormData();
  formData.set("email", "new-user@example.com");
  formData.set("password", "correct-horse-battery");
  formData.set("nickname", "New User");
  formData.set("csrfToken", "csrf-token");
  return formData;
}

describe("admin login return path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      nickname: "Admin",
      role: "admin",
      status: "active",
      passwordHash: "fixture-hash",
    });
    mocks.getCurrentLocale.mockResolvedValue("en");
    mocks.headers.mockResolvedValue(new Headers());
    mocks.sendAdminLoginSecurityEmail.mockResolvedValue(undefined);
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.hashPassword.mockResolvedValue("hashed-password");
    mocks.trackEvent.mockReset().mockResolvedValue(undefined);
    mocks.createUser.mockResolvedValue({ id: "new-user-1" });
    mocks.requireUser.mockResolvedValue({ id: "admin-1", googleSubject: null });
  });

  it("returns an admin to the requested English admin page after login", async () => {
    await expect(
      loginAction(loginForm("/en/admin/orders?status=pending#refund")),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/admin/orders?status=pending&locale=en#refund",
    );
  });

  it("keeps the admin dashboard as the fallback for ordinary login", async () => {
    await expect(loginAction(loginForm("/en/user"))).rejects.toThrow("NEXT_REDIRECT:/admin");
  });

  it("rejects old local passwords on Google-managed accounts", async () => {
    mocks.findUser.mockResolvedValueOnce({ id: "google-user", status: "active", googleSubject: "verified-subject", passwordHash: "old-local-hash" });
    await expect(loginAction(loginForm("/en/user"))).rejects.toThrow("google-login-required");
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
    expect(mocks.signInUser).not.toHaveBeenCalled();
  });

  it("rejects limited registration before querying or creating an account", async () => {
    mocks.assertRegistrationNotLimited.mockRejectedValueOnce(new Error("REGISTER_LIMITED"));
    await expect(registerAction(registrationForm())).rejects.toThrow("register-limited");
    expect(mocks.findUser).not.toHaveBeenCalled();
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });

  it("revokes previous sessions before issuing a new session after a password change", async () => {
    const formData = new FormData();
    formData.set("currentPassword", "old-password");
    formData.set("newPassword", "new-password");
    formData.set("confirmPassword", "new-password");
    await expect(changePasswordAction(formData)).rejects.toThrow("password=changed");
    expect(mocks.updatePasswordAndRevokeSessions).toHaveBeenCalledWith("admin-1", "new-password");
    expect(mocks.updatePasswordAndRevokeSessions.mock.invocationCallOrder[0]).toBeLessThan(mocks.signInUser.mock.invocationCallOrder[0]);
  });

  it("refuses local password changes for Google-managed accounts", async () => {
    mocks.requireUser.mockResolvedValueOnce({ id: "google-user", googleSubject: "verified-subject" });
    await expect(changePasswordAction(new FormData())).rejects.toThrow("password=google-managed");
    expect(mocks.updatePasswordAndRevokeSessions).not.toHaveBeenCalled();
    expect(mocks.signInUser).not.toHaveBeenCalled();
  });

  it("sends a non-admin to their user area instead of an admin page", async () => {
    mocks.findUser.mockResolvedValueOnce({
      id: "user-1",
      email: "user@example.com",
      nickname: "User",
      role: "user",
      status: "active",
      passwordHash: "fixture-hash",
    });

    await expect(loginAction(loginForm("/en/admin/users"))).rejects.toThrow("NEXT_REDIRECT:/en/user");
  });

  it("requires a chosen nickname and saves it at registration", async () => {
    const missingNickname = registrationForm();
    missingNickname.delete("nickname");
    await expect(registerAction(missingNickname)).rejects.toThrow();
    expect(mocks.createUser).not.toHaveBeenCalled();

    mocks.findUser.mockResolvedValueOnce(null);

    const formData = registrationForm();
    await expect(registerAction(formData)).rejects.toThrow("NEXT_REDIRECT:/en/user");

    expect(mocks.createUser).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "new-user@example.com",
        passwordHash: "hashed-password",
        nickname: "New User",
        avatar: expect.stringMatching(/^\/images\/user-avatars\/avatar-\d{2}\.webp$/),
      }),
    });
    expect(mocks.trackEvent).toHaveBeenCalledWith({
      eventName: "registration_completed",
      path: "/en/register",
      entityType: "user",
      entityId: "new-user-1",
      userId: "new-user-1",
      metadata: { locale: "en", registrationMethod: "password" },
    });
    expect(JSON.stringify(mocks.trackEvent.mock.calls)).not.toContain("new-user@example.com");
    expect(JSON.stringify(mocks.trackEvent.mock.calls)).not.toContain("hashed-password");
  });

  it("does not record another registration when the account already exists", async () => {
    await expect(registerAction(registrationForm())).rejects.toThrow("account-exists");
    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });

  it("does not prevent sign-in after registration if analytics fails", async () => {
    mocks.findUser.mockResolvedValueOnce(null);
    mocks.trackEvent.mockRejectedValueOnce(new Error("analytics unavailable"));
    await expect(registerAction(registrationForm())).rejects.toThrow("NEXT_REDIRECT:/en/user");
    expect(mocks.signInUser).toHaveBeenCalledWith("new-user-1");
  });
});
