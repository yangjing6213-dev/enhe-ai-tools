import { randomBytes, randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Explicit opt-in only: never use DATABASE_URL, production forwarding, or repository .env credentials.
const databaseUrl = process.env.ENHE_SECURITY_TEST_DATABASE_URL;
if (databaseUrl) {
  const database = new URL(databaseUrl);
  const name = decodeURIComponent(database.pathname.slice(1));
  if (!["postgres:", "postgresql:"].includes(database.protocol)
    || !["localhost", "127.0.0.1"].includes(database.hostname)
    || !/(?:^|[_-])(test|e2e)(?:[_-]|$)/i.test(name)
    || /(?:^|[_-])(prod|production|live)(?:[_-]|$)/i.test(name)) {
    throw new Error("Security checks require a dedicated loopback test/e2e PostgreSQL database.");
  }
}

const state = vi.hoisted(() => ({ db: null as PrismaClient | null, ip: "192.0.2.1" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-real-ip": state.ip, "x-forwarded-for": "198.51.100.9" }), cookies: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: new Proxy({}, {
  get(_target, property) {
    if (!state.db) throw new Error("Explicit security test database has not been initialized.");
    const value = Reflect.get(state.db, property, state.db);
    return typeof value === "function" ? value.bind(state.db) : value;
  }
}) }));
import { assertLoginNotLimited, assertRegistrationNotLimited, recordLoginAttempt, updatePasswordAndRevokeSessions, verifyPassword } from "./auth";

describe.skipIf(!databaseUrl)("real PostgreSQL security transactions", () => {
  const prefix = `security-${randomUUID()}`;
  const users: string[] = [];
  let db: PrismaClient;
  const nextIp = () => { state.ip = `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`; };

  beforeAll(async () => {
    db = new PrismaClient({ datasourceUrl: databaseUrl!, transactionOptions: { maxWait: 15_000, timeout: 30_000 } });
    await db.$connect();
    state.db = db;
  });
  afterAll(async () => {
    if (!db) return;
    try {
      await db.loginAttempt.deleteMany({ where: { OR: [{ identifier: { startsWith: prefix } }, { identifier: { startsWith: `register:${prefix}` } }] } });
      if (users.length) await db.user.deleteMany({ where: { id: { in: users }, isTestData: true } });
    } finally { state.db = null; await db.$disconnect(); }
  });

  it("executes advisory transaction lock SQL through the real Prisma driver", async () => {
    const rows = await db.$transaction((tx) => tx.$queryRaw<Array<{ lock: string }>>(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${prefix}))::text AS lock`));
    expect(rows).toHaveLength(1);
    expect(typeof rows[0].lock).toBe("string");
  });

  it("allows at most five concurrent login reservations for one account", async () => {
    nextIp();
    const identifier = `${prefix}-login`;
    const outcomes = await Promise.allSettled(Array.from({ length: 12 }, () => assertLoginNotLimited(identifier)));
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(5);
    const errors = outcomes.filter((outcome) => outcome.status === "rejected");
    expect(errors).toHaveLength(7);
    for (const result of errors) if (result.status === "rejected") expect(result.reason.message).toBe("LOGIN_LIMITED");
    expect(await db.loginAttempt.count({ where: { identifier, success: false } })).toBe(5);
    const accepted = outcomes.find((outcome) => outcome.status === "fulfilled");
    if (accepted?.status !== "fulfilled") throw new Error("Missing reservation");
    await recordLoginAttempt(identifier, true, accepted.value);
    expect(await db.loginAttempt.count({ where: { identifier, success: false } })).toBe(4);
    await expect(assertLoginNotLimited(identifier)).resolves.toEqual(expect.any(String));
  }, 30_000);

  it("limits a shared client IP across different login identifiers", async () => {
    nextIp();
    const outcomes = await Promise.allSettled(Array.from({ length: 36 }, (_, index) => assertLoginNotLimited(`${prefix}-ip-login-${index}`)));
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(30);
    for (const result of outcomes) if (result.status === "rejected") expect(result.reason.message).toBe("LOGIN_LIMITED");
    expect(await db.loginAttempt.count({ where: { ip: state.ip, success: false } })).toBe(30);
  }, 30_000);

  it("persists at most three concurrent registrations per account", async () => {
    nextIp();
    const identifier = `${prefix}-register`;
    const outcomes = await Promise.allSettled(Array.from({ length: 8 }, () => assertRegistrationNotLimited(identifier)));
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(3);
    for (const result of outcomes) if (result.status === "rejected") expect(result.reason.message).toBe("REGISTER_LIMITED");
    expect(await db.loginAttempt.count({ where: { identifier: `register:${identifier}` } })).toBe(3);
  }, 30_000);

  it("limits concurrent registrations across accounts from one IP", async () => {
    nextIp();
    const outcomes = await Promise.allSettled(Array.from({ length: 16 }, (_, index) => assertRegistrationNotLimited(`${prefix}-ip-register-${index}`)));
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(10);
    for (const result of outcomes) if (result.status === "rejected") expect(result.reason.message).toBe("REGISTER_LIMITED");
    expect(await db.loginAttempt.count({ where: { ip: state.ip, identifier: { startsWith: "register:" } } })).toBe(10);
  }, 30_000);

  it("changes the stored password and revokes all pre-existing sessions atomically", async () => {
    const user = await db.user.create({ data: { email: `${prefix}-password@example.test`, passwordHash: "old-test-hash", isTestData: true } });
    users.push(user.id);
    await db.session.createMany({ data: [1, 2, 3].map((index) => ({ userId: user.id, tokenHash: `${prefix}-session-${index}`, expiresAt: new Date(Date.now() + 60_000) })) });
    await updatePasswordAndRevokeSessions(user.id, "new-local-test-password");
    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword("new-local-test-password", updated.passwordHash)).toBe(true);
    expect(await db.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
    expect(await db.session.count({ where: { userId: user.id, revokedAt: { not: null } } })).toBe(3);
  });

  it("does not change Google-managed credentials or sessions", async () => {
    const user = await db.user.create({ data: { email: `${prefix}-google@example.test`, googleSubject: `${prefix}-google-subject`, passwordHash: "unchanged-test-hash", isTestData: true } });
    users.push(user.id);
    await db.session.create({ data: { userId: user.id, tokenHash: `${prefix}-google-session`, expiresAt: new Date(Date.now() + 60_000) } });
    await expect(updatePasswordAndRevokeSessions(user.id, "new-local-test-password")).rejects.toThrow("GOOGLE_MANAGED_PASSWORD");
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash).toBe("unchanged-test-hash");
    expect(await db.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(1);
  });
});
