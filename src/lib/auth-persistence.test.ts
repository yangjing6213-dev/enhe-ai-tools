import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ headers: vi.fn(), count: vi.fn(), create: vi.fn(), attemptUpdate: vi.fn(), lock: vi.fn(), findUser: vi.fn(), updateUser: vi.fn(), revoke: vi.fn(), hash: vi.fn(), transaction: vi.fn() }));
vi.mock("next/headers", () => ({ headers: mocks.headers, cookies: vi.fn() }));
vi.mock("bcryptjs", () => ({ default: { hash: mocks.hash, compare: vi.fn() } }));
vi.mock("@/lib/db", () => ({ prisma: {
  $transaction: mocks.transaction,
  loginAttempt: { update: mocks.attemptUpdate, findMany: vi.fn(async () => []), create: mocks.create },
} }));
import { assertLoginNotLimited, assertRegistrationNotLimited, recordLoginAttempt, updatePasswordAndRevokeSessions } from "./auth";

describe("persistent authentication protections", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.headers.mockResolvedValue(new Headers({ "x-real-ip": "192.0.2.1", "x-forwarded-for": "198.51.100.1" }));
    mocks.count.mockResolvedValue(0);
    mocks.create.mockResolvedValue({ id: "reserved-attempt" });
    mocks.findUser.mockResolvedValue({ googleSubject: null });
    mocks.hash.mockResolvedValue("new-password-hash");
    mocks.transaction.mockImplementation(async (fn) => fn({
      $queryRaw: mocks.lock, loginAttempt: { count: mocks.count, create: mocks.create },
      user: { findUnique: mocks.findUser, update: mocks.updateUser }, session: { updateMany: mocks.revoke }
    }));
  });
  it("reserves a durable login attempt under account and trusted IP locks", async () => {
    expect(await assertLoginNotLimited("user@example.com")).toBe("reserved-attempt");
    expect(mocks.lock).toHaveBeenCalledTimes(2);
    expect(mocks.count).toHaveBeenCalledWith({ where: expect.objectContaining({ ip: "192.0.2.1", success: false }) });
    const ipFilter = mocks.count.mock.calls.find(([query]) => query.where.ip)?.[0].where;
    expect(ipFilter).not.toHaveProperty("identifier");
    expect(mocks.create).toHaveBeenCalledWith({ data: { identifier: "user@example.com", ip: "192.0.2.1", success: false } });
  });
  it("blocks a distributed-account attack once the IP reaches its limit", async () => {
    mocks.count.mockResolvedValueOnce(0).mockResolvedValueOnce(30);
    await expect(assertLoginNotLimited("another@example.com")).rejects.toThrow("LOGIN_LIMITED");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("records outcome on the reserved row instead of double counting", async () => {
    await recordLoginAttempt("user@example.com", true, "reserved-attempt");
    expect(mocks.attemptUpdate).toHaveBeenCalledWith({ where: { id: "reserved-attempt", identifier: "user@example.com" }, data: { success: true } });
  });
  it("persists registration reservations and blocks repeated registrations", async () => {
    await assertRegistrationNotLimited("new@example.com");
    expect(mocks.create).toHaveBeenCalledWith({ data: { identifier: "register:new@example.com", ip: "192.0.2.1", success: true } });
    mocks.count.mockResolvedValueOnce(3).mockResolvedValueOnce(0);
    await expect(assertRegistrationNotLimited("new@example.com")).rejects.toThrow("REGISTER_LIMITED");
  });
  it("ignores a client supplied forwarded-for when trusted proxy IP is absent", async () => {
    mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.7" }));
    await assertLoginNotLimited("user@example.com");
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ ip: "unknown" }) });
  });
  it("updates the password and revokes all sessions in the same transaction", async () => {
    await updatePasswordAndRevokeSessions("user-1", "new-long-password");
    expect(mocks.updateUser).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { passwordHash: "new-password-hash" } });
    expect(mocks.revoke).toHaveBeenCalledWith({ where: { userId: "user-1", revokedAt: null }, data: { revokedAt: expect.any(Date) } });
  });
  it("never installs a usable local password for Google-managed users", async () => {
    mocks.findUser.mockResolvedValue({ googleSubject: "google-subject" });
    await expect(updatePasswordAndRevokeSessions("user-1", "new-long-password")).rejects.toThrow("GOOGLE_MANAGED_PASSWORD");
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.revoke).not.toHaveBeenCalled();
  });
  it("propagates a revocation failure so the transaction cannot commit a password-only change", async () => {
    mocks.revoke.mockRejectedValue(new Error("database unavailable"));
    await expect(updatePasswordAndRevokeSessions("user-1", "new-long-password")).rejects.toThrow("database unavailable");
  });
});
