import { PrismaClient } from "@prisma/client";

// Singleton, щоб у dev-режимі hot-reload не плодив нові з'єднання з БД.
// У проді — звичайний один інстанс на процес.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
