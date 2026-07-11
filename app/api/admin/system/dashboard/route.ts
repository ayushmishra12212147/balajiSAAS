import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { BackupService } from "@/modules/admin/services/backup-service";
import fs from "fs";
import path from "path";

const getFolderSize = (dirPath: string): number => {
  if (!fs.existsSync(dirPath)) return 0;
  let totalSize = 0;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    try {
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        totalSize += stats.size;
      } else if (stats.isDirectory()) {
        totalSize += getFolderSize(filePath);
      }
    } catch {
      // Ignore locks
    }
  }
  return totalSize;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * GET /api/admin/system/dashboard
 * Telemetry endpoint. Divides database vs application infrastructure health.
 */
export const GET = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ViewAudit"); // Requires system audit capability

  // 1. Database Health Telemetry
  let connection = "CONNECTED";
  let dbVersion = "PostgreSQL (Unknown)";
  let dbSize = "Unknown";

  try {
    const versionRes = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    dbVersion = versionRes?.[0]?.version || dbVersion;

    const sizeRes = await prisma.$queryRaw<Array<{ size: string }>>`SELECT pg_size_pretty(pg_database_size(current_database())) as size`;
    dbSize = sizeRes?.[0]?.size || dbSize;
  } catch {
    connection = "DISCONNECTED";
  }

  const backups = BackupService.listBackups();
  const lastBackup = backups.length > 0 ? backups[0].timestamp : null;

  // 2. Application Health Telemetry
  const activeSessionsCount = await prisma.session.count({
    where: {
      expiresAt: { gt: new Date() },
      isActive: true,
    },
  });

  const templatesCount = await prisma.printTemplate.count({
    where: { isDeleted: false },
  });

  // Calculate folder sizes
  const logsPath = path.join(process.cwd(), "logs");
  const backupsPath = path.join(process.cwd(), "backups");
  const uploadsPath = path.join(process.cwd(), "uploads");

  const logsSize = getFolderSize(logsPath);
  const backupsSize = getFolderSize(backupsPath);
  const uploadsSize = getFolderSize(uploadsPath);

  return {
    databaseHealth: {
      connection,
      version: dbVersion,
      size: dbSize,
      lastBackup,
    },
    applicationHealth: {
      activeSessions: activeSessionsCount,
      backgroundJobs: {
        running: 0,
        queued: 0,
      },
      queueStatus: "IDLE",
      systemVersion: "2.0.0",
    },
    storage: {
      database: dbSize,
      logs: formatBytes(logsSize),
      backups: formatBytes(backupsSize),
      uploads: formatBytes(uploadsSize),
      templatesCount,
    },
  };
});
