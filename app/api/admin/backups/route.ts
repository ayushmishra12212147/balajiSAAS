import { NextRequest, NextResponse } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { BackupService } from "@/modules/admin/services/backup-service";

/**
 * GET /api/admin/backups
 * List all available backups on disk
 */
export const GET = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "Backup");

  const backups = BackupService.listBackups();
  return backups;
});

/**
 * POST /api/admin/backups
 * Trigger creation of a new system backup archive
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "Backup");

  const body = await req.json().catch(() => ({}));
  const type = body.type === "INCREMENTAL" ? "INCREMENTAL" : "FULL";

  const backup = await BackupService.createBackup(type, context.employee.id);
  return backup;
});
