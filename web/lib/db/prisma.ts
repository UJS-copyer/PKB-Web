import "server-only";

import { PrismaClient } from "@prisma/client";

if (process.env.PRISMA_PREFER_DATABASE_URL !== "true" && process.env.DIRECT_URL && process.env.DATABASE_URL?.includes(":6543")) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}
