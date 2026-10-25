import { beforeEach, describe, expect, it, vi } from "vitest";

const { state, prismaMock } = vi.hoisted(() => {
  const state = {
    passwordHash: "old-hash",
    token: {
      id: "reset-token-1",
      userId: "user-1",
      email: "recovery@example.com",
      tokenHash: "stored-token-hash",
      purpose: "reset_password",
      expiresAt: new Date("2026-10-24T12:30:00.000Z"),
      consumedAt: null as Date | null,
      user: { status: "active" },
    },
    recoveryEmail: null as string | null,
    recoveryVerifiedAt: null as Date | null,
    sessions: [
      { id: "session-1", userId: "user-1", revokedAt: null as Date | null },
      { id: "session-2", userId: "user-1", revokedAt: new Date("2026-10-01T00:00:00.000Z") as Date | null },
      { id: "session-3", userId: "user-2", revokedAt: null as Date | null },
    ],
    attempts: [] as Array<{ emailHash: string; ipHash: string | null; createdAt: Date }>,
  };

  const tokenUpdateMany = vi.fn(async ({ where, data }: {
    where: { id?: string; userId?: string; purpose?: string; tokenHash?: string; consumedAt?: null; expiresAt?: { gt: Date } };
    data: { consumedAt: Date };
  }) => {
    const token = state.token;
    const matches = (!where.id || token.id === where.id) &&
      (!where.userId || token.userId === where.userId) &&
      (!where.purpose || token.purpose === where.purpose) &&
      (!Object.hasOwn(where, "consumedAt") || (where.consumedAt === null ? token.consumedAt === null : token.consumedAt !== null)) &&
      (!where.expiresAt || token.expiresAt > where.expiresAt.gt);
    if (!matches) return { count: 0 };
    token.consumedAt = data.consumedAt;
    return { count: 1 };
  });
  const updateUser = vi.fn(async ({ data }: { where: { id: string }; data: Record<string, unknown> }) => {
    if (typeof data.passwordHash === "string") state.passwordHash = data.passwordHash;
    if (typeof data.recoveryEmail === "string") state.recoveryEmail = data.recoveryEmail;
    if (data.recoveryVerifiedAt instanceof Date) state.recoveryVerifiedAt = data.recoveryVerifiedAt;
    return { id: "user-1", ...data };
  });
  const updateSessions = vi.fn(async ({ where, data }: {
    where: { userId: string; revokedAt: null };
    data: { revokedAt: Date };
  }) => {
    let count = 0;
    for (const session of state.sessions) {
      if (session.userId === where.userId && session.revokedAt === null) {
        session.revokedAt = data.revokedAt;
        count += 1;
      }
    }
    return { count };
  });
  const attemptCount = vi.fn(async ({ where }: {
    where: { emailHash?: string; ipHash?: string; createdAt: { gte: Date } };
  }) => state.attempts.filter((attempt) =>
    attempt.createdAt >= where.createdAt.gte &&
    (where.emailHash ? attempt.emailHash === where.emailHash : attempt.ipHash === where.ipHash)
  ).length);
  const attemptCreate = vi.fn(async ({ data }: {
    data: { emailHash: string; ipHash: string | null; createdAt: Date };
  }) => {
    state.attempts.push(data);
    return data;
  });
  const attemptDeleteMany = vi.fn(async ({ where }: { where: { createdAt: { lt: Date } } }) => {
    const before = state.attempts.length;
    state.attempts = state.attempts.filter((attempt) => attempt.createdAt >= where.createdAt.lt);
    return { count: before - state.attempts.length };
  });
  const tx = {
    accountRecoveryToken: { updateMany: tokenUpdateMany, deleteMany: vi.fn(async () => ({ count: 0 })) },
    accountRecoveryAttempt: { count: attemptCount, create: attemptCreate, deleteMany: attemptDeleteMany },
    user: { update: updateUser },
    session: { updateMany: updateSessions },
  };
  const prismaMock = {
    accountRecoveryToken: { findUnique: vi.fn(async () => state.token) },
    $transaction: vi.fn(async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx)),
  };

  return { state, prismaMock, tokenUpdateMany, updateUser, updateSessions };
});

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ hashPassword: vi.fn(async (password: string) => `hashed:${password}`) }));

describe("completePasswordReset", () => {
  beforeEach(() => {
    state.passwordHash = "old-hash";
    state.recoveryEmail = null;
    state.recoveryVerifiedAt = null;
    state.token.purpose = "reset_password";
    state.token.expiresAt = new Date("2026-10-24T12:30:00.000Z");
    state.token.consumedAt = null;
    state.token.user.status = "active";
    state.attempts.length = 0;
    state.sessions[0].revokedAt = null;
    state.sessions[1].revokedAt = new Date("2026-10-01T00:00:00.000Z");
    state.sessions[2].revokedAt = null;
    vi.clearAllMocks();
  });

  it("changes the password, consumes the one-time token, and revokes only active sessions in one transaction", async () => {
    const { completePasswordReset } = await import("@/lib/account-recovery");

    const completed = await completePasswordReset({
      token: "A".repeat(43),
      newPassword: "new-password-123",
      now: new Date("2026-10-24T12:00:00.000Z"),
    });

    expect(completed).toBe(true);
    expect(state.passwordHash).toBe("hashed:new-password-123");
    expect(state.token.consumedAt).toEqual(new Date("2026-10-24T12:00:00.000Z"));
    expect(state.sessions[0].revokedAt).toEqual(new Date("2026-10-24T12:00:00.000Z"));
    expect(state.sessions[1].revokedAt).toEqual(new Date("2026-10-01T00:00:00.000Z"));
    expect(state.sessions[2].revokedAt).toBeNull();
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(await completePasswordReset({
      token: "A".repeat(43),
      newPassword: "another-password-123",
      now: new Date("2026-10-24T12:01:00.000Z"),
    })).toBe(false);
    expect(state.passwordHash).toBe("hashed:new-password-123");
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(prismaMock.accountRecoveryToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: expect.any(String) },
      include: { user: { select: { status: true } } },
    });
  });

  it("rejects expired tokens without changing credentials", async () => {
    const { completePasswordReset } = await import("@/lib/account-recovery");
    state.token.expiresAt = new Date("2026-10-24T11:00:00.000Z");

    const expired = await completePasswordReset({
      token: "A".repeat(43),
      newPassword: "new-password-123",
      now: new Date("2026-10-24T12:00:00.000Z"),
    });

    expect(expired).toBe(false);
    expect(state.passwordHash).toBe("old-hash");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ["consumed", () => { state.token.consumedAt = new Date("2026-10-24T11:59:00.000Z"); }],
    ["wrong purpose", () => { state.token.purpose = "verify_recovery_email"; }],
    ["disabled account", () => { state.token.user.status = "disabled"; }],
  ])("rejects %s tokens without changing credentials", async (_name, prepare) => {
    const { completePasswordReset } = await import("@/lib/account-recovery");
    prepare();

    const completed = await completePasswordReset({
      token: "A".repeat(43),
      newPassword: "new-password-123",
      now: new Date("2026-10-24T12:00:00.000Z"),
    });

    expect(completed).toBe(false);
    expect(state.passwordHash).toBe("old-hash");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("creates high-entropy URL-safe tokens and stores only a one-way digest", async () => {
    const { createAccountRecoveryToken, hashAccountRecoveryToken } = await import("@/lib/account-recovery");
    const token = createAccountRecoveryToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hashAccountRecoveryToken(token)).not.toBe(token);
    expect(hashAccountRecoveryToken(token)).toBe(hashAccountRecoveryToken(token));
  });

  it("limits recovery requests by email and stores keyed digests instead of the raw address or IP", async () => {
    const { allowRecoveryRequest } = await import("@/lib/account-recovery");
    const now = new Date("2026-10-24T12:00:00.000Z");

    expect(await allowRecoveryRequest(" User@Example.com ", "203.0.113.20", now)).toBe(true);
    expect(await allowRecoveryRequest("user@example.com", "203.0.113.20", now)).toBe(true);
    expect(await allowRecoveryRequest("user@example.com", "203.0.113.20", now)).toBe(true);
    expect(await allowRecoveryRequest("user@example.com", "203.0.113.20", now)).toBe(false);
    expect(state.attempts).toHaveLength(3);
    expect(state.attempts[0].emailHash).not.toContain("user@example.com");
    expect(state.attempts[0].ipHash).not.toContain("203.0.113.20");
  });

  it("activates a recovery email only after a valid verification token is confirmed", async () => {
    const { completeRecoveryEmailVerification } = await import("@/lib/account-recovery");
    state.token.purpose = "verify_recovery_email";

    const verified = await completeRecoveryEmailVerification("A".repeat(43), new Date("2026-10-24T12:00:00.000Z"));

    expect(verified).toBe(true);
    expect(state.recoveryEmail).toBe("recovery@example.com");
    expect(state.recoveryVerifiedAt).toEqual(new Date("2026-10-24T12:00:00.000Z"));
    expect(state.token.consumedAt).toEqual(new Date("2026-10-24T12:00:00.000Z"));
  });
});
