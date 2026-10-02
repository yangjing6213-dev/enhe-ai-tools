import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertValidCsrfToken: vi.fn(),
  findUser: vi.fn(),
  getCurrentLocale: vi.fn(),
  headers: vi.fn(),
  recordLoginAttempt: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  sendAdminLoginSecurityEmail: vi.fn(),
  signInUser: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: mocks.findUser } } }));
vi.mock("@/lib/auth", () => ({
  assertLoginNotLimited: vi.fn(),
  getCurrentUser: vi.fn(),
  hashPassword: vi.fn(),
  recordLoginAttempt: mocks.recordLoginAttempt,
  requireAdmin: vi.fn(),
  requireUser: vi.fn(),
  signInUser: mocks.signInUser,
  signOutUser: vi.fn(),
  verifyPassword: mocks.verifyPassword,
}));
vi.mock("@/lib/csrf", () => ({ assertValidCsrfToken: mocks.assertValidCsrfToken }));
vi.mock("@/lib/i18n", () => ({ getCurrentLocale: mocks.getCurrentLocale }));
vi.mock("@/lib/admin-email-notifications", () => ({
  sendAdminLoginSecurityEmail: mocks.sendAdminLoginSecurityEmail,
  sendNewOrderAdminEmail: vi.fn(),
  sendOrderReceiptAdminEmail: vi.fn(),
  sendPaymentProofSubmittedAdminEmail: vi.fn(),
  sendPaymentReviewAdminEmail: vi.fn(),
  sendRefundRequestAdminEmail: vi.fn(),
}));

import { loginAction } from "@/app/actions";

function loginForm(returnTo: string) {
  const formData = new FormData();
  formData.set("email", "admin@example.com");
  formData.set("password", "correct-horse-battery");
  formData.set("csrfToken", "csrf-token");
  formData.set("returnTo", returnTo);
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
});
