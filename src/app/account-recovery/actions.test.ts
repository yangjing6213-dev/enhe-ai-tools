import { beforeEach, describe, expect, it, vi } from "vitest";

const { state, mocks } = vi.hoisted(() => {
  const state = {
    user: null as null | {
      id: string;
      status: "active" | "disabled";
      email: string | null;
      passwordHash: string;
      recoveryEmail: string | null;
      recoveryVerifiedAt: Date | null;
    },
    otherLoginEmail: null as string | null,
    createdToken: null as null | { data: Record<string, unknown> },
  };
  const tokenCreate = vi.fn(async (args: { data: Record<string, unknown> }) => {
    state.createdToken = args;
    return { id: "token-1", ...args.data };
  });
  const findUser = vi.fn(async ({ where }: { where: { id?: string; email?: string; recoveryEmail?: string } }) => {
    if (where.id) return state.user?.id === where.id ? state.user : null;
    if (where.recoveryEmail) return state.user?.recoveryEmail === where.recoveryEmail ? state.user : null;
    if (where.email) {
      if (state.user?.email === where.email) return state.user;
      if (state.otherLoginEmail === where.email) return { id: "user-2" };
    }
    return null;
  });
  const tx = {
    accountRecoveryToken: {
      updateMany: vi.fn(async () => ({ count: 0 })),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      create: tokenCreate,
    },
  };
  const prisma = {
    user: { findUnique: findUser, update: vi.fn() },
    $transaction: vi.fn(async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx)),
  };
  const mocks = {
    prisma,
    findUser,
    tokenCreate,
    allowRecoveryRequest: vi.fn(async () => true),
    createAccountRecoveryToken: vi.fn(() => "A".repeat(43)),
    getRecoveryTokenExpiry: vi.fn(() => new Date("2026-10-24T12:30:00.000Z")),
    hashAccountRecoveryToken: vi.fn(() => "opaque-digest"),
    normalizeRecoveryEmail: vi.fn((email: string) => email.trim().toLowerCase()),
    isValidRecoveryEmail: vi.fn((email: string) => email.includes("@")),
    completePasswordReset: vi.fn(async () => true),
    completeRecoveryEmailVerification: vi.fn(async () => true),
    requireUser: vi.fn(async () => ({ id: "user-1" })),
    verifyPassword: vi.fn(async () => true),
    assertValidCsrfToken: vi.fn(async () => undefined),
    sendAccountRecoveryEmail: vi.fn(async () => undefined),
    getCurrentLocale: vi.fn(async () => "zh"),
  };
  return { state, mocks };
});

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/account-recovery", () => ({
  allowRecoveryRequest: mocks.allowRecoveryRequest,
  completePasswordReset: mocks.completePasswordReset,
  completeRecoveryEmailVerification: mocks.completeRecoveryEmailVerification,
  createAccountRecoveryToken: mocks.createAccountRecoveryToken,
  getRecoveryTokenExpiry: mocks.getRecoveryTokenExpiry,
  hashAccountRecoveryToken: mocks.hashAccountRecoveryToken,
  isValidRecoveryEmail: mocks.isValidRecoveryEmail,
  normalizeRecoveryEmail: mocks.normalizeRecoveryEmail,
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser, verifyPassword: mocks.verifyPassword }));
vi.mock("@/lib/csrf", () => ({ assertValidCsrfToken: mocks.assertValidCsrfToken }));
vi.mock("@/lib/i18n", () => ({ getCurrentLocale: mocks.getCurrentLocale }));
vi.mock("@/lib/seo", () => ({ buildLocalePath: (path: string, locale: string) => locale === "en" ? `/en${path}` : path }));
vi.mock("@/lib/account-recovery-email", () => ({ sendAccountRecoveryEmail: mocks.sendAccountRecoveryEmail }));
vi.mock("next/headers", () => ({ headers: async () => ({ get: () => "203.0.113.10" }) }));
vi.mock("next/navigation", () => ({
  redirect: (location: string) => {
    const error = new Error("redirect");
    Object.assign(error, { location });
    throw error;
  },
}));

describe("account recovery actions", () => {
  beforeEach(() => {
    state.user = null;
    state.otherLoginEmail = null;
    state.createdToken = null;
    vi.clearAllMocks();
  });

  it("uses the same public response when an address has no verified recovery email", async () => {
    const { requestPasswordResetAction } = await import("@/app/account-recovery/actions");
    const formData = new FormData();
    formData.set("csrfToken", "csrf");
    formData.set("email", "old-login@example.com");

    await expect(requestPasswordResetAction(formData)).rejects.toMatchObject({ location: "/forgot-password?status=sent" });

    expect(mocks.sendAccountRecoveryEmail).not.toHaveBeenCalled();
    expect(state.createdToken).toBeNull();
  });

  it("sends reset links only to an active account's verified recovery email and stores a digest", async () => {
    state.user = {
      id: "user-1",
      status: "active",
      email: "safe@example.com",
      passwordHash: "password-hash",
      recoveryEmail: "safe@example.com",
      recoveryVerifiedAt: new Date("2026-10-20T00:00:00.000Z"),
    };
    const { requestPasswordResetAction } = await import("@/app/account-recovery/actions");
    const formData = new FormData();
    formData.set("csrfToken", "csrf");
    formData.set("email", " SAFE@example.com ");

    await expect(requestPasswordResetAction(formData)).rejects.toMatchObject({ location: "/forgot-password?status=sent" });

    expect(mocks.sendAccountRecoveryEmail).toHaveBeenCalledWith(expect.objectContaining({
      recipient: "safe@example.com",
      purpose: "reset_password",
      locale: "zh",
    }));
    expect(state.createdToken?.data).toMatchObject({ email: "safe@example.com", tokenHash: "opaque-digest", purpose: "reset_password" });
    expect(JSON.stringify(state.createdToken?.data)).not.toContain("A".repeat(43));
  });

  it("does not activate a newly supplied recovery email before its link is verified", async () => {
    state.user = {
      id: "user-1",
      status: "active",
      email: "login@example.com",
      passwordHash: "password-hash",
      recoveryEmail: null,
      recoveryVerifiedAt: null,
    };
    const { bindRecoveryEmailAction } = await import("@/app/account-recovery/actions");
    const formData = new FormData();
    formData.set("csrfToken", "csrf");
    formData.set("email", "new@example.com");
    formData.set("currentPassword", "current-password");

    await expect(bindRecoveryEmailAction(formData)).rejects.toMatchObject({ location: "/user/recovery-email?status=sent" });

    expect(mocks.sendAccountRecoveryEmail).toHaveBeenCalledWith(expect.objectContaining({
      recipient: "new@example.com",
      purpose: "verify_recovery_email",
    }));
    expect(state.createdToken?.data).toMatchObject({ email: "new@example.com", purpose: "verify_recovery_email" });
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });

  it("does not bind an email already used as another account's login address", async () => {
    state.user = {
      id: "user-1",
      status: "active",
      email: "login@example.com",
      passwordHash: "password-hash",
      recoveryEmail: null,
      recoveryVerifiedAt: null,
    };
    state.otherLoginEmail = "someone-elses-login@example.com";
    const { bindRecoveryEmailAction } = await import("@/app/account-recovery/actions");
    const formData = new FormData();
    formData.set("csrfToken", "csrf");
    formData.set("email", "someone-elses-login@example.com");
    formData.set("currentPassword", "current-password");

    await expect(bindRecoveryEmailAction(formData)).rejects.toMatchObject({
      location: "/user/recovery-email?status=conflict",
    });

    expect(mocks.sendAccountRecoveryEmail).not.toHaveBeenCalled();
    expect(state.createdToken).toBeNull();
  });
});
