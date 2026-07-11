import { PrismaClient } from "@prisma/client";
import { env } from "@/config/env";
import { BackupScheduler } from "@/modules/admin/services/backup-scheduler";

// Start background backup scheduler
BackupScheduler.start();

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
