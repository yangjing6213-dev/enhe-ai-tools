import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaClientConstructor = vi.hoisted(() => vi.fn());

vi.mock("@prisma/client", () => ({
  PrismaClient: prismaClientConstructor,
}));

type PrismaGlobalState = {
  prisma?: unknown;
  prismaProxy?: unknown;
};

const globalState = globalThis as typeof globalThis & PrismaGlobalState;
const originalPrisma = globalState.prisma;
const originalPrismaProxy = globalState.prismaProxy;

describe("Prisma client lazy bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("DATABASE_URL", undefined);
    delete globalState.prisma;
    delete globalState.prismaProxy;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@prisma/client");
    if (originalPrisma === undefined) delete globalState.prisma;
    else globalState.prisma = originalPrisma;
    if (originalPrismaProxy === undefined) delete globalState.prismaProxy;
    else globalState.prismaProxy = originalPrismaProxy;
  });

  it("does not construct PrismaClient while importing the database module", async () => {
    const { prisma } = await import("@/lib/db");

    expect(prisma).toBeDefined();
    expect(prismaClientConstructor).not.toHaveBeenCalled();
  });
});
