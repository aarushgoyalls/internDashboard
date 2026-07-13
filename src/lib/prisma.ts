import { PrismaClient } from "@prisma/client";

// In dev, Next.js hot-reload re-runs modules constantly. Without this singleton
// we'd spawn a new PrismaClient (and DB connection pool) on every reload and
// exhaust Neon's connection limit. We stash one instance on the global object.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
