import { prisma } from "@/lib/prisma";

export class SystemStatusService {
  /**
   * Performs a database query probe to verify database connectivity.
   */
  public static async getHealth() {
    try {
      // Direct raw query probe (safe static query without variables)
      await prisma.$queryRaw`SELECT 1`;
      
      return {
        database: "CONNECTED",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        database: "DISCONNECTED",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }
}
