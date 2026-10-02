import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixturePath = "../../tests/fixtures/admin-visual-db";

describe("read-only admin database fixture", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "1");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("DIRECT_URL", "");
    vi.stubEnv("SEO_AUDIT_TEST_DATABASE_URL", "");
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ["user", "create"],
    ["siteSetting", "upsert"],
    ["file", "delete"],
    ["order", "updateMany"],
    ["toolPurchase", "deleteMany"],
  ])("refuses Prisma write operation %s.%s", async (model, operation) => {
    const { prisma } = await import(fixturePath);
    const modelDelegate = (prisma as unknown as Record<string, Record<string, unknown>>)[model];

    expect(() => modelDelegate[operation]).toThrow(
      `Database writes are disabled in the admin visual fixture: ${model}.${operation}`,
    );
  });

  it.each(["$transaction", "$queryRaw", "$executeRaw"])(
    "refuses raw or transactional Prisma operation %s",
    async (operation) => {
      const { prisma } = await import(fixturePath);
      const rootOperation = (prisma as unknown as Record<string, (...args: never[]) => unknown>)[operation];

      expect(() => rootOperation()).toThrow(
        `Database operations are disabled in the admin visual fixture: prisma.${operation}`,
      );
    },
  );

  it.each([
    ["without the explicit fixture opt-in", "ENHE_ADMIN_VISUAL_FIXTURE", "0"],
    ["in production mode", "NODE_ENV", "production"],
    ["with a configured database URL", "DATABASE_URL", "postgresql://fixture:fixture@127.0.0.1:5432/fixture"],
    ["with a configured direct database URL", "DIRECT_URL", "postgresql://fixture:fixture@127.0.0.1:5432/fixture"],
    ["with a configured SEO audit test database URL", "SEO_AUDIT_TEST_DATABASE_URL", "postgresql://fixture:fixture@127.0.0.1:5432/fixture"],
  ])("refuses to load %s", async (_scenario, variable, value) => {
    vi.stubEnv(variable, value);

    const rejectionMessage = await import(fixturePath).then(
      () => null,
      (error: unknown) => (error instanceof Error ? error.message : String(error)),
    );

    expect(rejectionMessage).toBe(
      "The admin visual database fixture is available only in local database-free development.",
    );
  });

  it("retains a read-only count operation for empty-state previews", async () => {
    const { prisma } = await import(fixturePath);

    await expect(prisma.user.count()).resolves.toBe(0);
  });

  it("keeps the existing single-tool fixture unless empty-tools mode is explicitly enabled", async () => {
    const { prisma } = await import(fixturePath);
    const args = { orderBy: { name: "asc" }, select: { id: true, name: true } };

    await expect(prisma.tool.findMany(args)).resolves.toMatchObject([
      { id: "local-visual-tool", name: "Local visual fixture tool" }
    ]);

    vi.resetModules();
    vi.stubEnv("ENHE_ADMIN_VISUAL_EMPTY_TOOLS", "1");
    const emptyFixture = await import(fixturePath);

    await expect(emptyFixture.prisma.tool.findMany(args)).resolves.toEqual([]);
  });

  it.each([
    ["in production mode", "NODE_ENV", "production"],
    ["with a configured database", "DATABASE_URL", "postgresql://fixture:fixture@127.0.0.1:5432/fixture"],
  ])("does not permit empty-tools mode %s", async (_scenario, variable, value) => {
    vi.stubEnv("ENHE_ADMIN_VISUAL_EMPTY_TOOLS", "1");
    vi.stubEnv(variable, value);

    await expect(import(fixturePath)).rejects.toThrow(
      "The admin visual database fixture is available only in local database-free development.",
    );
  });
});
