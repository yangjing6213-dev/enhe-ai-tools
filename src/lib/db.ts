import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaProxy?: PrismaClient;
};

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["error", "warn"]
          : ["error"],
    });
  }

  return globalForPrisma.prisma;
}

export const prisma =
  globalForPrisma.prisma ??
  globalForPrisma.prismaProxy ??
  new Proxy({} as PrismaClient, {
    get(_target, property) {
      const client = getPrismaClient();
      const value = Reflect.get(client, property, client);
      return typeof value === "function" ? value.bind(client) : value;
    },
  });

if (!globalForPrisma.prisma) {
  globalForPrisma.prismaProxy = prisma;
}
