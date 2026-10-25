import { beforeEach, describe, expect, it, vi } from "vitest";

const { state, prismaMock } = vi.hoisted(() => {
  const state = {
    users: [{ id: "user-1", passwordHash: "old-hash" }],
    sessions: [
      { id: "session-1", userId: "user-1", revokedAt: null as Date | null },
      { id: "session-2", userId: "user-1", revokedAt: new Date("2026-01-01T00:00:00.000Z") as Date | null },
      { id: "session-3", userId: "user-2", revokedAt: null as Date | null },
    ],
  };

  const updateUser = vi.fn(async ({ where, data }: { where: { id: string }; data: { passwordHash: string } }) => {
    const user = state.users.find((item) => item.id === where.id);
    if (!user) throw new Error("user not found");
    user.passwordHash = data.passwordHash;
    return user;
  });
  const updateSessions = vi.fn(async ({ where, data }: {
    where: { userId: string; revokedAt: null };
    data: { revokedAt: Date };
  }) => {
    let count = 0;
    for (const session of state.sessions) {
      if (session.userId === where.userId && session.revokedAt === where.revokedAt) {
        session.revokedAt = data.revokedAt;
        count += 1;
      }
    }
    return { count };
  });
  const tx = { user: { update: updateUser }, session: { updateMany: updateSessions } };
  const prismaMock = {
    user: { update: updateUser },
    session: { updateMany: updateSessions },
    $transaction: vi.fn(async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx)),
  };

  return { state, prismaMock };
});

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
  requireAdmin: vi.fn(async () => ({ id: "admin-1", role: "admin" })),
}));
vi.mock("@/lib/admin-audit", () => ({
  getAdminAuditRequestContext: vi.fn(async () => ({})),
  writeAdminAuditLog: vi.fn(async () => undefined),
}));
vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

describe("admin password reset", () => {
  beforeEach(() => {
    state.users[0].passwordHash = "old-hash";
    state.sessions[0].revokedAt = null;
    state.sessions[1].revokedAt = new Date("2026-01-01T00:00:00.000Z");
    state.sessions[2].revokedAt = null;
    vi.clearAllMocks();
  });

  it("changes the password and revokes only that user's active sessions", async () => {
    const { resetUserPasswordAction } = await import("@/app/admin/actions");
    const formData = new FormData();
    formData.set("id", "user-1");
    formData.set("password", "a-new-password");

    await resetUserPasswordAction(formData);

    expect(state.users[0].passwordHash).toBe("hashed:a-new-password");
    expect(state.sessions[0].revokedAt).toBeInstanceOf(Date);
    expect(state.sessions[1].revokedAt).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(state.sessions[2].revokedAt).toBeNull();
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
  });
});
